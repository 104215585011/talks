import type { LinguaCharacter } from "@/lib/characters/characters";

export type ChatMessageForModel = {
  role: "user" | "assistant";
  content: string;
};

export type ModelStreamInput = {
  characterId: string;
  systemPrompt: string;
  messages: ChatMessageForModel[];
};

export type ModelStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "final";
      corrections: string[];
      newWords: string[];
    };

export type ModelClient = {
  streamMessage(input: ModelStreamInput): AsyncGenerator<ModelStreamEvent>;
};

type ModelClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

const DEFAULT_MODEL_API_BASE_URL = "https://v2.aicodee.com";
const DEFAULT_MODEL_NAME = "MiniMax-M2.7-highspeed";

function isConfiguredApiKey(apiKey: string | undefined) {
  return Boolean(apiKey && !apiKey.includes("replace-with") && !apiKey.includes("placeholder"));
}

function getFallbackReply(characterId: string, message: string) {
  if (characterId === "emma") {
    return `Certainly. A more polished version would be: "${message}".`;
  }

  if (characterId === "jake") {
    return `Nice. You could say it more naturally like this: "${message}".`;
  }

  return `Great practice. Let us refine this sentence together: "${message}".`;
}

export function createModelClient(
  apiKey = process.env.MODEL_API_KEY,
  options?: ModelClientOptions
): ModelClient {
  const resolvedApiKey = options?.apiKey ?? apiKey;
  const baseUrl = (
    options?.baseUrl ??
    process.env.MODEL_API_BASE_URL ??
    DEFAULT_MODEL_API_BASE_URL
  ).replace(/\/+$/, "");
  const model = options?.model ?? process.env.MODEL_NAME ?? DEFAULT_MODEL_NAME;

  return {
    async *streamMessage(input) {
      if (!isConfiguredApiKey(resolvedApiKey)) {
        const lastMessage = input.messages[input.messages.length - 1]?.content ?? "";
        const reply = getFallbackReply(input.characterId, lastMessage);
        const words = reply.split(" ");

        for (const [index, word] of words.entries()) {
          yield { type: "delta", text: index === 0 ? word : ` ${word}` };
        }

        yield {
          type: "final",
          corrections: ["Review word order and punctuation."],
          newWords: ["polished", "natural"]
        };
        return;
      }
      const modelApiKey = resolvedApiKey as string;

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${modelApiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 700,
          stream: true,
          messages: [
            {
              role: "system",
              content: `${input.systemPrompt}\n\nAt the end, include concise corrections and new vocabulary in the final structured summary.`
            },
            ...input.messages
          ]
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Model API request failed with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          const data = line.slice(6);

          if (data === "[DONE]") {
            continue;
          }

          const event = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string;
              };
            }>;
          };

          const text = event.choices?.[0]?.delta?.content;

          if (text) {
            yield {
              type: "delta",
              text
            };
          }
        }
      }

      yield {
        type: "final",
        corrections: [],
        newWords: []
      };
    }
  };
}

export function getCharacterSystemPrompt(character: LinguaCharacter) {
  return character.systemPrompt;
}
