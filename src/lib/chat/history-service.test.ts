import type { MessageRole } from "@prisma/client";
import { encryptMessageContent } from "./message-crypto";
import { listUserHistory } from "./history-service";

const now = new Date("2026-05-08T00:00:00.000Z");

function makeEncryptedMessage(content: string) {
  const encrypted = encryptMessageContent(content, "secret-key");

  return {
    id: "message_1",
    sessionId: "session_1",
    role: "ASSISTANT" satisfies MessageRole,
    audioUrl: null,
    metadata: null,
    createdAt: now,
    ...encrypted
  };
}

describe("history service", () => {
  test("returns decrypted latest message summaries", async () => {
    const db = {
      session: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "session_1",
            userId: "user_1",
            characterId: "emma",
            title: "Hello",
            status: "ACTIVE",
            createdAt: now,
            updatedAt: now,
            character: {
              id: "emma",
              name: "Emma Clarke"
            },
            messages: [makeEncryptedMessage("Readable history")]
          }
        ]),
        count: jest.fn().mockResolvedValue(1)
      }
    };

    const result = await listUserHistory(db, {
      userId: "user_1",
      page: 1,
      pageSize: 20,
      encryptionSecret: "secret-key"
    });

    expect(result.sessions[0]).toMatchObject({
      id: "session_1",
      latestMessage: {
        content: "Readable history"
      }
    });
    expect(result.sessions[0]).not.toHaveProperty("messages");
  });
});
