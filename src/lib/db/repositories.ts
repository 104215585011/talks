import type { Character, Message, MessageRole, PrismaClient, Session, User } from "@prisma/client";

type UserDelegate = Pick<PrismaClient["user"], "create" | "findUnique" | "update">;
type CharacterDelegate = Pick<PrismaClient["character"], "create" | "findUnique" | "findMany">;
type SessionDelegate = Pick<PrismaClient["session"], "create" | "findMany" | "update">;
type MessageDelegate = Pick<PrismaClient["message"], "create" | "findMany">;

export type UserRepositoryDb = {
  user: UserDelegate;
};

export type CharacterRepositoryDb = {
  character: CharacterDelegate;
};

export type SessionRepositoryDb = {
  session: SessionDelegate;
};

export type MessageRepositoryDb = {
  message: MessageDelegate;
};

export type CreateUserInput = {
  email: string;
  name?: string;
  nativeLanguage?: string;
  targetLanguage?: string;
};

export type CreateCharacterInput = {
  slug: string;
  name: string;
  locale: string;
  systemPrompt: string;
  avatarUrl?: string;
};

export type AddMessageInput = {
  sessionId: string;
  role: MessageRole;
  content: string;
  audioUrl?: string;
};

export async function createUser(db: UserRepositoryDb, input: CreateUserInput): Promise<User> {
  return db.user.create({
    data: input
  });
}

export async function getUserByEmail(db: UserRepositoryDb, email: string): Promise<User | null> {
  return db.user.findUnique({
    where: { email }
  });
}

export async function updateUserTargetLanguage(
  db: UserRepositoryDb,
  userId: string,
  targetLanguage: string
): Promise<User> {
  return db.user.update({
    where: { id: userId },
    data: { targetLanguage }
  });
}

export async function createCharacter(
  db: CharacterRepositoryDb,
  input: CreateCharacterInput
): Promise<Character> {
  return db.character.create({
    data: input
  });
}

export async function getCharacterBySlug(
  db: CharacterRepositoryDb,
  slug: string
): Promise<Character | null> {
  return db.character.findUnique({
    where: { slug }
  });
}

export async function listActiveCharacters(db: CharacterRepositoryDb): Promise<Character[]> {
  return db.character.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
}

export async function createSession(
  db: SessionRepositoryDb,
  userId: string,
  characterId: string,
  title?: string
): Promise<Session> {
  return db.session.create({
    data: {
      userId,
      characterId,
      title
    }
  });
}

export async function listUserSessions(
  db: SessionRepositoryDb,
  userId: string
): Promise<Session[]> {
  return db.session.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" }
  });
}

export async function archiveSession(db: SessionRepositoryDb, sessionId: string): Promise<Session> {
  return db.session.update({
    where: { id: sessionId },
    data: { status: "ARCHIVED" }
  });
}

export async function addMessage(
  db: MessageRepositoryDb,
  input: AddMessageInput
): Promise<Message> {
  return db.message.create({
    data: input
  });
}

export async function listSessionMessages(
  db: MessageRepositoryDb,
  sessionId: string
): Promise<Message[]> {
  return db.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" }
  });
}
