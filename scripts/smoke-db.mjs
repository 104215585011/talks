import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const runId = `smoke-${Date.now()}`;
const email = `${runId}@example.com`;
const characterSlug = `${runId}-emma`;

async function main() {
  const user = await prisma.user.create({
    data: {
      email,
      name: "Smoke Learner",
      nativeLanguage: "zh-CN",
      targetLanguage: "en-GB"
    }
  });

  const character = await prisma.character.create({
    data: {
      slug: characterSlug,
      name: "Emma Smoke",
      locale: "en-GB",
      systemPrompt: "You are Emma for smoke testing."
    }
  });

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      characterId: character.id,
      title: "Smoke chat"
    }
  });

  await prisma.message.createMany({
    data: [
      {
        sessionId: session.id,
        role: "USER",
        content: "Hello"
      },
      {
        sessionId: session.id,
        role: "ASSISTANT",
        content: "Hello, welcome to LinguaAI."
      }
    ]
  });

  const loadedSession = await prisma.session.findUnique({
    where: { id: session.id },
    include: {
      user: true,
      character: true,
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!loadedSession) {
    throw new Error("Smoke session was not created");
  }

  if (loadedSession.user.email !== email) {
    throw new Error("Smoke user relation did not load correctly");
  }

  if (loadedSession.character.slug !== characterSlug) {
    throw new Error("Smoke character relation did not load correctly");
  }

  if (loadedSession.messages.length !== 2) {
    throw new Error("Smoke messages were not created correctly");
  }

  await prisma.user.delete({
    where: { id: user.id }
  });

  await prisma.character.delete({
    where: { id: character.id }
  });

  console.log("Database smoke CRUD passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
