import type { Message, PrismaClient } from "@prisma/client";
import { getCharacterById } from "@/lib/characters/characters";
import { toCharacterSeedData } from "@/lib/characters/character-seed";
import {
  createClaudeClient,
  getCharacterSystemPrompt,
  type ChatMessageForModel,
  type ClaudeClient
} from "./claude-client";
import { decryptMessageContent, encryptMessageContent } from "./message-crypto";

type ChatDb = {
  session: Pick<PrismaClient["session"], "create" | "findFirst">;
  message: Pick<PrismaClient["message"], "create" | "findMany">;
  character: Pick<PrismaClient["character"], "upsert">;
};

export type SendChatMessageInput = {
  userId: string;
  characterId: string;
  message: string;
  sessionId?: string;
  encryptionSecret: string;
  claudeClient?: ClaudeClient;
};

export type ChatStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      sessionId: string;
      corrections: string[];
      newWords: string[];
    };

function decryptStoredMessage(message: Message, encryptionSecret: string) {
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

function toModelMessages(messages: Message[], encryptionSecret: string): ChatMessageForModel[] {
  return messages
    .filter((message) => message.role !== "SYSTEM")
    .map((message) => ({
      role: message.role === "ASSISTANT" ? "assistant" : "user",
      content: decryptStoredMessage(message, encryptionSecret)
    }));
}

export async function* streamChatMessage(
  db: ChatDb,
  input: SendChatMessageInput
): AsyncGenerator<ChatStreamEvent> {
  const character = getCharacterById(input.characterId);

  if (!character) {
    throw new Error("CHARACTER_NOT_FOUND");
  }

  const characterData = toCharacterSeedData(character);

  await db.character.upsert({
    where: {
      id: character.id
    },
    update: characterData,
    create: characterData
  });

  const session = input.sessionId
    ? await db.session.findFirst({
        where: {
          id: input.sessionId,
          userId: input.userId
        }
      })
    : await db.session.create({
        data: {
          userId: input.userId,
          characterId: character.id,
          title: input.message.slice(0, 80)
        }
      });

  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }

  const previousMessages = await db.message.findMany({
    where: {
      sessionId: session.id
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const encryptedUserMessage = encryptMessageContent(input.message, input.encryptionSecret);

  await db.message.create({
    data: {
      sessionId: session.id,
      role: "USER",
      ...encryptedUserMessage
    }
  });

  const claudeClient = input.claudeClient ?? createClaudeClient();
  const messages = [
    ...toModelMessages(previousMessages, input.encryptionSecret),
    {
      role: "user" as const,
      content: input.message
    }
  ];
  let assistantText = "";
  let corrections: string[] = [];
  let newWords: string[] = [];

  for await (const event of claudeClient.streamMessage({
    characterId: character.id,
    systemPrompt: getCharacterSystemPrompt(character),
    messages
  })) {
    if (event.type === "delta") {
      assistantText += event.text;
      yield {
        type: "delta",
        text: event.text
      };
    } else {
      corrections = event.corrections;
      newWords = event.newWords;
    }
  }

  const encryptedAssistantMessage = encryptMessageContent(assistantText, input.encryptionSecret);

  await db.message.create({
    data: {
      sessionId: session.id,
      role: "ASSISTANT",
      ...encryptedAssistantMessage,
      metadata: {
        corrections,
        newWords
      }
    }
  });

  yield {
    type: "done",
    sessionId: session.id,
    corrections,
    newWords
  };
}

export async function sendChatMessage(db: ChatDb, input: SendChatMessageInput) {
  let assistantText = "";
  let sessionId = "";
  let corrections: string[] = [];
  let newWords: string[] = [];

  for await (const event of streamChatMessage(db, input)) {
    if (event.type === "delta") {
      assistantText += event.text;
    } else {
      sessionId = event.sessionId;
      corrections = event.corrections;
      newWords = event.newWords;
    }
  }

  return {
    sessionId,
    assistantText,
    corrections,
    newWords
  };
}
