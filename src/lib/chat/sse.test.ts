import { parseSseChunk } from "./sse";

describe("parseSseChunk", () => {
  it("parses complete SSE events and returns unfinished remainder", () => {
    const result = parseSseChunk(
      'event: delta\ndata: {"text":"Hello"}\n\nevent: done\ndata: {"sessionId":"s1"}\n\npartial'
    );

    expect(result.events).toEqual([
      { event: "delta", data: { text: "Hello" } },
      { event: "done", data: { sessionId: "s1" } }
    ]);
    expect(result.remainder).toBe("partial");
  });

  it("ignores invalid JSON payloads without breaking the stream", () => {
    const result = parseSseChunk("event: delta\ndata: {oops}\n\n");

    expect(result.events).toEqual([]);
    expect(result.remainder).toBe("");
  });
});
