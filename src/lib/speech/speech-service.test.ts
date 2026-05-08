import {
  createSpeechRecognizer,
  createSpeechSynthesizer,
  getCharacterVoiceConfig,
  isConfiguredSecret
} from "./speech-service";

function streamToText(stream: ReadableStream<Uint8Array>) {
  return new Response(stream).text();
}

describe("speech service", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("detects placeholder API secrets as unconfigured", () => {
    expect(isConfiguredSecret(undefined)).toBe(false);
    expect(isConfiguredSecret("replace-with-key")).toBe(false);
    expect(isConfiguredSecret("placeholder")).toBe(false);
    expect(isConfiguredSecret("real-key")).toBe(true);
  });

  test("maps each LinguaAI character to an independent voice slot", () => {
    const voices = ["emma", "jake", "sophie", "kenji", "carlos"].map((id) =>
      getCharacterVoiceConfig(id, {
        FISH_AUDIO_REFERENCE_ID_CARLOS: "voice-carlos",
        FISH_AUDIO_REFERENCE_ID_EMMA: "voice-emma",
        FISH_AUDIO_REFERENCE_ID_JAKE: "voice-jake",
        FISH_AUDIO_REFERENCE_ID_KENJI: "voice-kenji",
        FISH_AUDIO_REFERENCE_ID_SOPHIE: "voice-sophie"
      })
    );

    expect(new Set(voices.map((voice) => voice.voiceId)).size).toBe(5);
    expect(voices.map((voice) => voice.locale)).toEqual([
      "en-GB",
      "en-US",
      "fr-FR",
      "ja-JP",
      "es-MX"
    ]);
  });

  test("streams Fish Audio when reference id and key are configured", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("audio-chunk"));
            controller.close();
          }
        })
      )
    );
    const synthesizer = createSpeechSynthesizer({
      env: {
        FISH_AUDIO_API_KEY: "real-fish-key",
        FISH_AUDIO_REFERENCE_ID_EMMA: "voice-emma"
      },
      fetcher: fetchMock
    });

    const result = await synthesizer.synthesize({
      characterId: "emma",
      text: "Hello there"
    });

    expect(result.provider).toBe("fish-audio");
    expect(result.contentType).toBe("audio/mpeg");
    expect(await streamToText(result.stream)).toBe("audio-chunk");
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(requestInit.body as string) as Record<string, unknown>;

    expect(requestBody).toEqual(
      expect.objectContaining({
        format: "mp3",
        reference_id: "voice-emma",
        text: "Hello there"
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.fish.audio/v1/tts",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer real-fish-key",
          model: "s2-pro"
        }),
        method: "POST"
      })
    );
  });

  test("falls back to Azure TTS when Fish Audio is unavailable", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("azure-audio"));
            controller.close();
          }
        })
      )
    );
    const synthesizer = createSpeechSynthesizer({
      env: {
        AZURE_TTS_API_KEY: "real-azure-key",
        AZURE_TTS_REGION: "eastus"
      },
      fetcher: fetchMock
    });

    const result = await synthesizer.synthesize({
      characterId: "jake",
      text: "Ship it"
    });

    expect(result.provider).toBe("azure");
    expect(result.contentType).toBe("audio/mpeg");
    expect(await streamToText(result.stream)).toBe("azure-audio");
  });

  test("recognizes speech through Whisper fallback when configured", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      Response.json({
        text: "bonjour"
      })
    );
    const recognizer = createSpeechRecognizer({
      env: {
        WHISPER_API_KEY: "real-whisper-key"
      },
      fetcher: fetchMock
    });

    await expect(
      recognizer.recognize({
        audioBase64: "YXVkaW8=",
        language: "fr-FR",
        mimeType: "audio/webm"
      })
    ).resolves.toEqual({
      language: "fr-FR",
      provider: "whisper",
      transcript: "bonjour"
    });
  });
});
