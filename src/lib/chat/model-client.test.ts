import { createModelClient } from "./model-client";

async function collectStream(client: ReturnType<typeof createModelClient>) {
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

describe("model client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("streams a complete fallback response when no API key is configured", async () => {
    const events = await collectStream(createModelClient(undefined));

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

  test("streams text deltas from OpenAI-compatible SSE responses", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            [
              'data: {"choices":[{"delta":{"content":"Hello"}}]}',
              "",
              'data: {"choices":[{"delta":{"content":" there"}}]}',
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

    const events = await collectStream(createModelClient("test-api-key"));

    expect(global.fetch).toHaveBeenCalledWith(
      "https://v2.aicodee.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-api-key"
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

  test("uses a custom OpenAI-compatible API base URL", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            ['data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}', ""].join(
              "\n"
            )
          )
        );
        controller.close();
      }
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body
    });

    await collectStream(
      createModelClient("test-api-key", {
        baseUrl: "https://v2.aicodee.com/"
      })
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "https://v2.aicodee.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  test("uses the MiniMax highspeed model by default", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.close();
        }
      })
    });

    await collectStream(createModelClient("test-api-key"));

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string) as { model: string };

    expect(body.model).toBe("MiniMax-M2.7-highspeed");
  });

  test("asks configured models to emit parseable learning notes", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.close();
        }
      })
    });

    await collectStream(createModelClient("test-api-key"));

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string) as {
      messages: Array<{ content: string; role: string }>;
    };

    expect(body.messages[0].content).toContain("<learning_notes>");
    expect(body.messages[0].content).toContain("corrections");
    expect(body.messages[0].content).toContain("newWords");
  });
});
