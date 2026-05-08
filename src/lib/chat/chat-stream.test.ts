import type { MessageRole } from "@prisma/client";
import { streamChatMessage } from "./chat-service";

const now = new Date("2026-05-08T00:00:00.000Z");

function makeMessage(role: MessageRole, content: string) {
  return {
    id: `${role}_${content}`,
    sessionId: "session_1",
    role,
    content,
    contentIv: null,
    contentAuthTag: null,
    audioUrl: null,
    metadata: null,
    createdAt: now
  };
}

describe("chat stream service", () => {
  test("yields deltas as the model produces them before the final done event", async () => {
    const db = {
      session: {
        create: jest.fn().mockResolvedValue({
          id: "session_1",
          userId: "user_1",
          characterId: "emma",
          title: "Hello",
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now
        }),
        findFirst: jest.fn()
      },
      message: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockResolvedValueOnce(makeMessage("USER", "Hello"))
          .mockResolvedValueOnce(makeMessage("ASSISTANT", "Hi there"))
      },
      character: {
        upsert: jest.fn().mockResolvedValue({
          id: "emma"
        })
      }
    };
    const modelClient = {
      streamMessage: jest.fn(async function* () {
        yield { type: "delta" as const, text: "Hi" };
        yield { type: "delta" as const, text: " there" };
        yield {
          type: "final" as const,
          corrections: ["Say: Hello there."],
          newWords: ["there"]
        };
      })
    };

    const events = [];

    for await (const event of streamChatMessage(db, {
      userId: "user_1",
      characterId: "emma",
      message: "Hello",
      encryptionSecret: "secret-key",
      modelClient
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "delta", text: "Hi" },
      { type: "delta", text: " there" },
      {
        type: "done",
        sessionId: "session_1",
        corrections: ["Say: Hello there."],
        newWords: ["there"]
      }
    ]);
  });
});
