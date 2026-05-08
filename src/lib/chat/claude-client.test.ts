import { createClaudeClient } from "./claude-client";

async function collectStream(client: ReturnType<typeof createClaudeClient>) {
  const events = [];

  for await (const event of client.streamMessage({
    characterId: "emma",
    systemPrompt: "You are Emma.",
    messages: [{ role: "user", content: "I go school yesterday" }]
  })) {
    events.push(event);
  }

  return events;
}

describe("Claude client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("streams a complete fallback response when no API key is configured", async () => {
    const events = await collectStream(createClaudeClient(undefined));

    expect(events[0]).toEqual({ type: "delta", text: "Certainly." });
    expect(
      events
        .filter((event) => event.type === "delta")
        .map((event) => event.text)
        .join("")
    ).toBe('Certainly. A more polished version would be: "I go school yesterday".');
    expect(events.at(-1)).toEqual({
      type: "final",
      corrections: ["Review word order and punctuation."],
      newWords: ["polished", "natural"]
    });
  });

  test("streams text deltas from Anthropic SSE responses", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}',
              "",
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" there"}}',
              "",
              "data: [DONE]",
              "",
              ""
            ].join("\n")
          )
        );
        controller.close();
      }
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body
    });

    const events = await collectStream(createClaudeClient("test-api-key"));

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "test-api-key",
          "anthropic-version": "2023-06-01"
        }),
        body: expect.stringContaining('"stream":true')
      })
    );
    expect(events).toEqual([
      { type: "delta", text: "Hello" },
      { type: "delta", text: " there" },
      { type: "final", corrections: [], newWords: [] }
    ]);
  });
});
