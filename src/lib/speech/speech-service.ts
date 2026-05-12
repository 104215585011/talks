type SpeechEnv = Record<string, string | undefined>;
type Fetcher = typeof fetch;

type VoiceConfig = {
  azureVoice: string;
  characterId: string;
  label: string;
  locale: string;
  voiceId: string;
};

type SynthesizeInput = {
  characterId: string;
  text: string;
};

type SynthesizeResult = {
  contentType: string;
  provider: "azure" | "fish-audio" | "local";
  stream: ReadableStream<Uint8Array>;
};

type RecognizeInput = {
  audioBase64: string;
  language: string;
  mimeType: string;
};

type RecognizeResult = {
  language: string;
  provider: "fish-audio" | "local";
  transcript: string;
};

const CHARACTER_VOICE_CONFIG: Record<string, Omit<VoiceConfig, "voiceId"> & { envKey: string }> = {
  carlos: {
    azureVoice: "es-MX-JorgeNeural",
    characterId: "carlos",
    envKey: "FISH_AUDIO_REFERENCE_ID_CARLOS",
    label: "Carlos Mendez",
    locale: "es-MX"
  },
  emma: {
    azureVoice: "en-GB-SoniaNeural",
    characterId: "emma",
    envKey: "FISH_AUDIO_REFERENCE_ID_EMMA",
    label: "Emma Clarke",
    locale: "en-GB"
  },
  jake: {
    azureVoice: "en-US-GuyNeural",
    characterId: "jake",
    envKey: "FISH_AUDIO_REFERENCE_ID_JAKE",
    label: "Jake Wilson",
    locale: "en-US"
  },
  kenji: {
    azureVoice: "ja-JP-KeitaNeural",
    characterId: "kenji",
    envKey: "FISH_AUDIO_REFERENCE_ID_KENJI",
    label: "Kenji Tanaka",
    locale: "ja-JP"
  },
  sophie: {
    azureVoice: "fr-FR-DeniseNeural",
    characterId: "sophie",
    envKey: "FISH_AUDIO_REFERENCE_ID_SOPHIE",
    label: "Sophie Dubois",
    locale: "fr-FR"
  }
};

const LOCAL_WAV_BASE64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
const FISH_AUDIO_DEFAULT_LATENCY = "balanced";

export function isConfiguredSecret(value: string | undefined) {
  return Boolean(
    value &&
    !value.toLowerCase().includes("replace-with") &&
    !value.toLowerCase().includes("placeholder")
  );
}

export function getCharacterVoiceConfig(characterId: string, env: SpeechEnv = process.env) {
  const config = CHARACTER_VOICE_CONFIG[characterId];

  if (!config) {
    throw new Error("Unsupported character voice");
  }

  return {
    azureVoice: config.azureVoice,
    characterId: config.characterId,
    label: config.label,
    locale: config.locale,
    voiceId: env[config.envKey] ?? ""
  } satisfies VoiceConfig;
}

function bytesToStream(bytes: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
}

function fallbackAudio(): SynthesizeResult {
  return {
    contentType: "audio/wav",
    provider: "local",
    stream: bytesToStream(Uint8Array.from(Buffer.from(LOCAL_WAV_BASE64, "base64")))
  };
}

function buildSsml(input: SynthesizeInput, voice: VoiceConfig) {
  return `<speak version="1.0" xml:lang="${voice.locale}"><voice name="${voice.azureVoice}">${escapeXml(
    input.text
  )}</voice></speak>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function createSpeechSynthesizer({
  env = process.env,
  fetcher = fetch
}: {
  env?: SpeechEnv;
  fetcher?: Fetcher;
} = {}) {
  return {
    async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
      const voice = getCharacterVoiceConfig(input.characterId, env);

      if (isConfiguredSecret(env.FISH_AUDIO_API_KEY) && isConfiguredSecret(voice.voiceId)) {
        const response = await fetcher("https://api.fish.audio/v1/tts", {
          body: JSON.stringify({
            chunk_length: 300,
            format: "mp3",
            latency: env.FISH_AUDIO_LATENCY ?? FISH_AUDIO_DEFAULT_LATENCY,
            model: env.FISH_AUDIO_MODEL ?? "s1",
            normalize: true,
            reference_id: voice.voiceId,
            sample_rate: 44100,
            text: input.text,
            top_p: 0.7,
            temperature: 0.7,
            prosody: {
              normalize_loudness: true,
              speed: 1,
              volume: 0
            }
          }),
          headers: {
            authorization: `Bearer ${env.FISH_AUDIO_API_KEY}`,
            "content-type": "application/json"
          },
          method: "POST"
        });

        if (response.ok && response.body) {
          return {
            contentType: response.headers.get("content-type") ?? "audio/mpeg",
            provider: "fish-audio",
            stream: response.body
          };
        }
      }

      if (isConfiguredSecret(env.AZURE_TTS_API_KEY) && isConfiguredSecret(env.AZURE_TTS_REGION)) {
        const response = await fetcher(
          `https://${env.AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
          {
            body: buildSsml(input, voice),
            headers: {
              "content-type": "application/ssml+xml",
              "ocp-apim-subscription-key": env.AZURE_TTS_API_KEY as string,
              "x-microsoft-outputformat": "audio-24khz-48kbitrate-mono-mp3"
            },
            method: "POST"
          }
        );

        if (response.ok && response.body) {
          return {
            contentType: response.headers.get("content-type") ?? "audio/mpeg",
            provider: "azure",
            stream: response.body
          };
        }
      }

      return fallbackAudio();
    }
  };
}

export function createSpeechRecognizer({
  env = process.env,
  fetcher = fetch
}: {
  env?: SpeechEnv;
  fetcher?: Fetcher;
} = {}) {
  return {
    async recognize(input: RecognizeInput): Promise<RecognizeResult> {
      if (isConfiguredSecret(env.FISH_AUDIO_API_KEY)) {
        const audioBytes = Uint8Array.from(Buffer.from(input.audioBase64, "base64"));
        const formData = new FormData();
        formData.append("audio", new Blob([audioBytes], { type: input.mimeType }), "speech.webm");
        formData.append("language", input.language.split("-")[0] ?? input.language);
        formData.append("ignore_timestamps", "true");

        const response = await fetcher("https://api.fish.audio/v1/asr", {
          body: formData,
          headers: {
            authorization: `Bearer ${env.FISH_AUDIO_API_KEY}`
          },
          method: "POST"
        });

        if (response.ok) {
          const payload = (await response.json()) as { text?: string };

          return {
            language: input.language,
            provider: "fish-audio",
            transcript: payload.text ?? ""
          };
        }
      }

      return {
        language: input.language,
        provider: "local",
        transcript: ""
      };
    }
  };
}

export const SUPPORTED_ASR_LANGUAGES = [
  "en-US",
  "en-GB",
  "fr-FR",
  "ja-JP",
  "es-MX",
  "zh-CN"
] as const;
