import type { LinguaCharacter } from "@/lib/characters/characters";

export type ChatMessageForModel = {
  role: "user" | "assistant";
  content: string;
};

export type ClaudeStreamInput = {
  characterId: string;
  systemPrompt: string;
  messages: ChatMessageForModel[];
};

export type ClaudeStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "final";
      corrections: string[];
      newWords: string[];
    };

export type ClaudeClient = {
  streamMessage(input: ClaudeStreamInput): AsyncGenerator<ClaudeStreamEvent>;
};

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

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

export function createClaudeClient(apiKey = process.env.CLAUDE_API_KEY): ClaudeClient {
  return {
    async *streamMessage(input) {
      if (!isConfiguredApiKey(apiKey)) {
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
      const anthropicApiKey = apiKey as string;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 700,
          stream: true,
          system: `${input.systemPrompt}\n\nAt the end, include concise corrections and new vocabulary in the final structured summary.`,
          messages: input.messages
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Claude API request failed with ${response.status}`);
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
            type?: string;
            delta?: {
              type?: string;
              text?: string;
            };
          };

          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            yield {
              type: "delta",
              text: event.delta.text ?? ""
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
