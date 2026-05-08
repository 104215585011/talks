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
  const [sessions, total] = await Promise.all([
    db.session.findMany({
      where: {
        userId: input.userId
      },
      orderBy: {
        updatedAt: "desc"
      },
      skip,
      take: input.pageSize,
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
          take: 1
        }
      }
    }),
    db.session.count({
      where: {
        userId: input.userId
      }
    })
  ]);

  return {
    page: input.page,
    pageSize: input.pageSize,
    total,
    sessions: (sessions as SessionWithLatestMessage[]).map((session) => {
      const latestMessage = session.messages[0];

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
          : null
      };
    })
  };
}
