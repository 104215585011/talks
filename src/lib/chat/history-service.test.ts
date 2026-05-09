import type { MessageRole } from "@prisma/client";
import { encryptMessageContent } from "./message-crypto";
import { listUserHistory } from "./history-service";

const now = new Date("2026-05-08T00:00:00.000Z");

function makeEncryptedMessage(content: string, overrides: Partial<ReturnType<typeof baseMessage>> = {}) {
  const encrypted = encryptMessageContent(content, "secret-key");

  return {
    ...baseMessage(),
    ...encrypted,
    ...overrides
  };
}

function baseMessage() {
  return {
    id: "message_1",
    sessionId: "session_1",
    role: "ASSISTANT" satisfies MessageRole,
    audioUrl: null,
    metadata: null,
    createdAt: now
  };
}

describe("history service", () => {
  test("returns decrypted latest message summaries and recent messages", async () => {
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
            messages: [
              makeEncryptedMessage("Readable history"),
              makeEncryptedMessage("Hello history", {
                id: "message_2",
                role: "USER" satisfies MessageRole
              })
            ]
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
      },
      messages: [
        {
          content: "Hello history",
          role: "USER"
        },
        {
          content: "Readable history",
          role: "ASSISTANT"
        }
      ],
      hasMoreMessages: false
    });
  });

  test("marks a session as having earlier messages when the extra page item exists", async () => {
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
            messages: [
              makeEncryptedMessage("Newest", { id: "message_3" }),
              makeEncryptedMessage("Older", { id: "message_2" }),
              makeEncryptedMessage("Oldest extra", { id: "message_1" })
            ]
          }
        ]),
        count: jest.fn().mockResolvedValue(1)
      }
    };

    const result = await listUserHistory(db, {
      userId: "user_1",
      page: 1,
      pageSize: 2,
      encryptionSecret: "secret-key"
    });

    expect(result.sessions[0].messages.map((message) => message.content)).toEqual([
      "Older",
      "Newest"
    ]);
    expect(result.sessions[0].hasMoreMessages).toBe(true);
  });
});
