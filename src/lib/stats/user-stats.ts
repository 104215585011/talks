import type { MessageRole, PrismaClient } from "@prisma/client";

type StatsDb = {
  session: Pick<PrismaClient["session"], "findMany">;
};

type BuildStatsInput = {
  now?: Date;
  userId: string;
};

type SessionForStats = {
  characterId: string;
  character: {
    name: string;
  };
  createdAt: Date;
  messages: Array<{
    content: string;
    createdAt: Date;
    role: MessageRole;
  }>;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function countWords(text: string) {
  const matches = text.toLowerCase().match(/[\p{L}\p{N}'-]+/gu);
  return new Set(matches ?? []).size;
}

function estimateMinutes(session: SessionForStats) {
  if (session.messages.length < 2) {
    return session.messages.length;
  }

  const first = session.messages[0]?.createdAt.getTime() ?? session.createdAt.getTime();
  const last = session.messages[session.messages.length - 1]?.createdAt.getTime() ?? first;

  return Math.max(1, Math.round((last - first) / 60000));
}

function buildAchievements(sessions: SessionForStats[], vocabulary: number, streakDays: number) {
  return [
    ...(sessions.length > 0
      ? [{ id: "first-chat", label: "First conversation", unlocked: true }]
      : []),
    ...(vocabulary >= 5
      ? [{ id: "vocabulary-builder", label: "Vocabulary builder", unlocked: true }]
      : []),
    ...(streakDays >= 3 ? [{ id: "streak-3", label: "3-day streak", unlocked: true }] : [])
  ];
}

export async function buildUserStats(db: StatsDb, input: BuildStatsInput) {
  const now = input.now ?? new Date();
  const sessions = (await db.session.findMany({
    include: {
      character: {
        select: {
          name: true
        }
      },
      messages: {
        orderBy: {
          createdAt: "asc"
        },
        select: {
          content: true,
          createdAt: true,
          role: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    where: {
      userId: input.userId
    }
  })) as SessionForStats[];

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => addDays(now, index - 6));
  const minutesByDate = new Map<string, number>();
  const activeDates = new Set<string>();
  const characterCounts = new Map<string, { characterName: string; count: number }>();

  let messageCount = 0;
  let vocabulary = 0;

  for (const session of sessions) {
    const dateKey = toDateKey(session.createdAt);
    const minutes = estimateMinutes(session);
    minutesByDate.set(dateKey, (minutesByDate.get(dateKey) ?? 0) + minutes);
    activeDates.add(dateKey);
    messageCount += session.messages.length;

    const characterStats = characterCounts.get(session.characterId) ?? {
      characterName: session.character.name,
      count: 0
    };
    characterStats.count += 1;
    characterCounts.set(session.characterId, characterStats);

    for (const message of session.messages) {
      vocabulary += countWords(message.content);
    }
  }

  let streakDays = 0;
  let cursor = new Date(now);

  while (activeDates.has(toDateKey(cursor))) {
    streakDays += 1;
    cursor = addDays(cursor, -1);
  }

  if (streakDays === 0) {
    cursor = addDays(now, -1);
    while (activeDates.has(toDateKey(cursor))) {
      streakDays += 1;
      cursor = addDays(cursor, -1);
    }
  }

  const conversationMinutes = lastSevenDays.map((date) => ({
    date: toDateKey(date),
    minutes: minutesByDate.get(toDateKey(date)) ?? 0
  }));
  const totalMinutes = conversationMinutes.reduce((sum, item) => sum + item.minutes, 0);

  return {
    achievements: buildAchievements(sessions, vocabulary, streakDays),
    characterInteractions: Array.from(characterCounts.entries()).map(([characterId, value]) => ({
      characterId,
      characterName: value.characterName,
      count: value.count
    })),
    conversationMinutes,
    streakDays,
    totals: {
      conversationMinutes: totalMinutes,
      messages: messageCount,
      sessions: sessions.length,
      vocabulary
    },
    vocabularyBreakdown: [
      { label: "Practised", value: vocabulary },
      { label: "Target", value: Math.max(0, 50 - vocabulary) }
    ]
  };
}
