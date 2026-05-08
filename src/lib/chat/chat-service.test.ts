import type { MessageRole } from "@prisma/client";
import { sendChatMessage } from "./chat-service";

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

describe("chat service", () => {
  test("creates a session, persists user and assistant messages, and returns final fields", async () => {
    const db = {
      session: {
        create: jest.fn().mockResolvedValue({
          id: "session_1",
          userId: "user_1",
          characterId: "character_1",
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
    const claudeClient = {
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

    const result = await sendChatMessage(db, {
      userId: "user_1",
      characterId: "emma",
      message: "Hello",
      encryptionSecret: "secret-key",
      claudeClient
    });

    expect(result.sessionId).toBe("session_1");
    expect(result.assistantText).toBe("Hi there");
    expect(result.corrections).toEqual(["Say: Hello there."]);
    expect(result.newWords).toEqual(["there"]);
    expect(db.message.create).toHaveBeenCalledTimes(2);
    expect(db.character.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "emma" }
      })
    );
    expect(claudeClient.streamMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        characterId: "emma",
        messages: [{ role: "user", content: "Hello" }]
      })
    );
  });
});
