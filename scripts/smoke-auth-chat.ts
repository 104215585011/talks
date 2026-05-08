import { PrismaClient } from "@prisma/client";
import { loginUser, refreshAccessToken, registerUser } from "../src/lib/auth/auth-service";
import { sendChatMessage } from "../src/lib/chat/chat-service";

const prisma = new PrismaClient();
const runId = `m1-${Date.now()}`;
const email = `${runId}@example.com`;
const jwtSecret = process.env.JWT_SECRET ?? "local-smoke-jwt-secret";
const encryptionSecret = process.env.MESSAGE_ENCRYPTION_KEY ?? "local-smoke-message-secret";

async function main() {
  const registered = await registerUser(prisma, {
    email,
    password: "Password123!",
    name: "M1 Smoke",
    jwtSecret
  });

  if (registered.status !== 201 || !registered.accessToken || !registered.refreshToken) {
    throw new Error("Registration smoke failed");
  }

  const loggedIn = await loginUser(prisma, {
    email,
    password: "Password123!",
    jwtSecret
  });

  if (loggedIn.status !== 200 || !loggedIn.accessToken) {
    throw new Error("Login smoke failed");
  }

  const refreshed = await refreshAccessToken(prisma, {
    refreshToken: registered.refreshToken,
    jwtSecret
  });

  if (refreshed.status !== 200 || !refreshed.accessToken) {
    throw new Error("Refresh token smoke failed");
  }

  const chat = await sendChatMessage(prisma, {
    userId: registered.user.id,
    characterId: "emma",
    message: "Hello Emma",
    encryptionSecret
  });

  if (!chat.sessionId || !chat.assistantText) {
    throw new Error("Chat smoke failed");
  }

  await prisma.session.deleteMany({
    where: {
      userId: registered.user.id
    }
  });
  await prisma.refreshToken.deleteMany({
    where: {
      userId: registered.user.id
    }
  });
  await prisma.user.delete({
    where: {
      id: registered.user.id
    }
  });

  console.log("M1 auth and chat smoke passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
