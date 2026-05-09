import type { Message, PrismaClient, SessionStatus } from "@prisma/client";
import { decryptMessageContent } from "./message-crypto";

type HistoryDb = {
  session: Pick<PrismaClient["session"], "findMany" | "count">;
};

type ListUserHistoryInput = {
  userId: string;
  page: number;
  pageSize: number;
  encryptionSecret: string;
  sessionId?: string;
};

type SessionWithLatestMessage = {
  id: string;
  userId: string;
  characterId: string;
  title: string | null;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  character: {
    id: string;
    name: string;
  };
  messages: Message[];
};

function toReadableContent(message: Message, encryptionSecret: string) {
  if (!message.contentIv || !message.contentAuthTag) {
    return message.content;
  }

  return decryptMessageContent(
    {
      content: message.content,
      contentIv: message.contentIv,
      contentAuthTag: message.contentAuthTag
    },
    encryptionSecret
  );
}

export async function listUserHistory(db: HistoryDb, input: ListUserHistoryInput) {
  const skip = (input.page - 1) * input.pageSize;
  const sessionSkip = input.sessionId ? 0 : skip;
  const messageSkip = input.sessionId ? skip : 0;
  const [sessions, total] = await Promise.all([
    db.session.findMany({
      where: {
        userId: input.userId,
        ...(input.sessionId ? { id: input.sessionId } : {})
      },
      orderBy: {
        updatedAt: "desc"
      },
      skip: sessionSkip,
      take: input.sessionId ? 1 : input.pageSize,
      include: {
        character: {
          select: {
            id: true,
            name: true
          }
        },
        messages: {
          orderBy: {
            createdAt: "desc"
          },
          skip: messageSkip,
          take: input.pageSize + 1
        }
      }
    }),
    db.session.count({
      where: {
        userId: input.userId,
        ...(input.sessionId ? { id: input.sessionId } : {})
      }
    })
  ]);

  return {
    page: input.page,
    pageSize: input.pageSize,
    total,
    sessions: (sessions as SessionWithLatestMessage[]).map((session) => {
      const latestMessage = session.messages[0];
      const visibleMessages = session.messages.slice(0, input.pageSize);

      return {
        id: session.id,
        characterId: session.characterId,
        characterName: session.character.name,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        latestMessage: latestMessage
          ? {
              id: latestMessage.id,
              role: latestMessage.role,
              content: toReadableContent(latestMessage, input.encryptionSecret),
              createdAt: latestMessage.createdAt
            }
          : null,
        hasMoreMessages: session.messages.length > input.pageSize,
        messages: visibleMessages
          .map((message) => ({
            id: message.id,
            role: message.role,
            content: toReadableContent(message, input.encryptionSecret),
            createdAt: message.createdAt
          }))
          .reverse()
      };
    })
  };
}
