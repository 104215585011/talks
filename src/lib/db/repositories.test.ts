import type { Character, Message, MessageRole, Session, SessionStatus, User } from "@prisma/client";
import {
  addMessage,
  archiveSession,
  createCharacter,
  createSession,
  createUser,
  getCharacterBySlug,
  getUserByEmail,
  listActiveCharacters,
  listSessionMessages,
  listUserSessions,
  updateUserTargetLanguage
} from "./repositories";

const now = new Date("2026-05-08T00:00:00.000Z");

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_1",
    email: "learner@example.com",
    name: "Learner",
    passwordHash: "",
    nativeLanguage: "zh-CN",
    targetLanguage: "en-GB",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "character_1",
    slug: "emma",
    name: "Emma",
    locale: "en-GB",
    voice: "voice-emma",
    bio: "Bio",
    style: "Style",
    systemPrompt: "You are Emma.",
    avatarUrl: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session_1",
    userId: "user_1",
    characterId: "character_1",
    title: "First chat",
    status: "ACTIVE" satisfies SessionStatus,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "message_1",
    sessionId: "session_1",
    role: "USER" satisfies MessageRole,
    content: "Hello",
    contentIv: null,
    contentAuthTag: null,
    audioUrl: null,
    metadata: null,
    createdAt: now,
    ...overrides
  };
}

describe("database repositories", () => {
  test("creates and reads a user by email", async () => {
    const user = makeUser();
    const db = {
      user: {
        create: jest.fn().mockResolvedValue(user),
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn()
      }
    };

    await expect(
      createUser(db, { email: user.email, name: user.name ?? undefined })
    ).resolves.toEqual(user);
    await expect(getUserByEmail(db, user.email)).resolves.toEqual(user);
    expect(db.user.create).toHaveBeenCalledWith({ data: { email: user.email, name: user.name } });
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: user.email } });
  });

  test("updates a user's target language", async () => {
    const updatedUser = makeUser({ targetLanguage: "ja-JP" });
    const db = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(updatedUser)
      }
    };

    await expect(updateUserTargetLanguage(db, "user_1", "ja-JP")).resolves.toEqual(updatedUser);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { targetLanguage: "ja-JP" }
    });
  });

  test("creates, reads, and lists active characters", async () => {
    const character = makeCharacter();
    const db = {
      character: {
        create: jest.fn().mockResolvedValue(character),
        findUnique: jest.fn().mockResolvedValue(character),
        findMany: jest.fn().mockResolvedValue([character])
      }
    };

    await expect(
      createCharacter(db, {
        slug: character.slug,
        name: character.name,
        locale: character.locale,
        systemPrompt: character.systemPrompt
      })
    ).resolves.toEqual(character);
    await expect(getCharacterBySlug(db, "emma")).resolves.toEqual(character);
    await expect(listActiveCharacters(db)).resolves.toEqual([character]);
    expect(db.character.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });
  });

  test("creates, lists, and archives sessions", async () => {
    const session = makeSession();
    const archivedSession = makeSession({ status: "ARCHIVED" });
    const db = {
      session: {
        create: jest.fn().mockResolvedValue(session),
        findMany: jest.fn().mockResolvedValue([session]),
        update: jest.fn().mockResolvedValue(archivedSession)
      }
    };

    await expect(createSession(db, "user_1", "character_1", "First chat")).resolves.toEqual(
      session
    );
    await expect(listUserSessions(db, "user_1")).resolves.toEqual([session]);
    await expect(archiveSession(db, "session_1")).resolves.toEqual(archivedSession);
    expect(db.session.create).toHaveBeenCalledWith({
      data: { userId: "user_1", characterId: "character_1", title: "First chat" }
    });
    expect(db.session.update).toHaveBeenCalledWith({
      where: { id: "session_1" },
      data: { status: "ARCHIVED" }
    });
  });

  test("adds and lists messages in chronological order", async () => {
    const userMessage = makeMessage();
    const assistantMessage = makeMessage({
      id: "message_2",
      role: "ASSISTANT",
      content: "Hello, how can I help?"
    });
    const db = {
      message: {
        create: jest.fn().mockResolvedValue(userMessage),
        findMany: jest.fn().mockResolvedValue([userMessage, assistantMessage])
      }
    };

    await expect(
      addMessage(db, { sessionId: "session_1", role: "USER", content: "Hello" })
    ).resolves.toEqual(userMessage);
    await expect(listSessionMessages(db, "session_1")).resolves.toEqual([
      userMessage,
      assistantMessage
    ]);
    expect(db.message.findMany).toHaveBeenCalledWith({
      where: { sessionId: "session_1" },
      orderBy: { createdAt: "asc" }
    });
  });
});
