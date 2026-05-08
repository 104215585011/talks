import { buildUserStats } from "./user-stats";

const now = new Date("2026-05-08T00:00:00.000Z");

describe("buildUserStats", () => {
  test("builds report metrics from sessions and messages", async () => {
    const db = {
      session: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "session_1",
            characterId: "emma",
            createdAt: new Date("2026-05-06T00:00:00.000Z"),
            character: { name: "Emma Clarke" },
            messages: [
              {
                role: "USER",
                content: "hello world",
                createdAt: new Date("2026-05-06T00:00:00.000Z")
              },
              {
                role: "ASSISTANT",
                content: "polished natural reply",
                createdAt: new Date("2026-05-06T00:02:00.000Z")
              }
            ]
          },
          {
            id: "session_2",
            characterId: "jake",
            createdAt: new Date("2026-05-07T00:00:00.000Z"),
            character: { name: "Jake Wilson" },
            messages: [
              { role: "USER", content: "ship it", createdAt: new Date("2026-05-07T00:00:00.000Z") }
            ]
          }
        ])
      }
    };

    await expect(buildUserStats(db, { now, userId: "user_1" })).resolves.toEqual({
      achievements: expect.arrayContaining([
        expect.objectContaining({ id: "first-chat" }),
        expect.objectContaining({ id: "vocabulary-builder" })
      ]),
      characterInteractions: [
        { characterId: "emma", characterName: "Emma Clarke", count: 1 },
        { characterId: "jake", characterName: "Jake Wilson", count: 1 }
      ],
      conversationMinutes: [
        { date: "2026-05-02", minutes: 0 },
        { date: "2026-05-03", minutes: 0 },
        { date: "2026-05-04", minutes: 0 },
        { date: "2026-05-05", minutes: 0 },
        { date: "2026-05-06", minutes: 2 },
        { date: "2026-05-07", minutes: 1 },
        { date: "2026-05-08", minutes: 0 }
      ],
      streakDays: 2,
      totals: {
        conversationMinutes: 3,
        messages: 3,
        sessions: 2,
        vocabulary: 7
      },
      vocabularyBreakdown: [
        { label: "Practised", value: 7 },
        { label: "Target", value: 43 }
      ]
    });
    expect(db.session.findMany).toHaveBeenCalledWith({
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
        userId: "user_1"
      }
    });
  });
});
