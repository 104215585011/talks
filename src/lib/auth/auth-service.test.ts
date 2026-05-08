import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  AuthError,
  loginUser,
  refreshAccessToken,
  registerUser,
  verifyAccessToken
} from "./auth-service";

const jwtSecret = "test-secret-that-is-long-enough-for-hs256";
const now = new Date("2026-05-08T00:00:00.000Z");

function makeUser(overrides = {}) {
  return {
    id: "user_1",
    email: "learner@example.com",
    name: "Learner",
    passwordHash: bcrypt.hashSync("Password123!", 10),
    nativeLanguage: "zh-CN",
    targetLanguage: "en-GB",
    createdAt: now,
    updatedAt: now,
    sessions: [],
    refreshTokens: [],
    ...overrides
  };
}

describe("auth service", () => {
  test("registers a new user and returns tokens", async () => {
    const user = makeUser();
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(user)
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: "refresh_1" })
      }
    };

    const result = await registerUser(db, {
      email: " Learner@Example.com ",
      password: "Password123!",
      name: "Learner",
      jwtSecret
    });

    expect(result.status).toBe(201);
    expect(result.user.email).toBe("learner@example.com");
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "learner@example.com",
        name: "Learner",
        passwordHash: expect.stringMatching(/^\$2/)
      })
    });
  });

  test("rejects duplicate email registration with 409", async () => {
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue(makeUser()),
        create: jest.fn()
      },
      refreshToken: {
        create: jest.fn()
      }
    };

    await expect(
      registerUser(db, {
        email: "learner@example.com",
        password: "Password123!",
        jwtSecret
      })
    ).rejects.toMatchObject(new AuthError(409, "EMAIL_ALREADY_EXISTS"));
  });

  test("maps database unique conflicts to 409 during registration", async () => {
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique", {
            code: "P2002",
            clientVersion: "test"
          })
        )
      },
      refreshToken: {
        create: jest.fn()
      }
    };

    await expect(
      registerUser(db, {
        email: "learner@example.com",
        password: "Password123!",
        jwtSecret
      })
    ).rejects.toMatchObject(new AuthError(409, "EMAIL_ALREADY_EXISTS"));
  });

  test("logs in with a correct password and returns a valid JWT", async () => {
    const user = makeUser();
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user)
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: "refresh_1" })
      }
    };

    const result = await loginUser(db, {
      email: "learner@example.com",
      password: "Password123!",
      jwtSecret
    });

    const payload = await verifyAccessToken(result.accessToken, jwtSecret);
    expect(result.status).toBe(200);
    expect(payload.sub).toBe("user_1");
    expect(payload.email).toBe("learner@example.com");
  });

  test("rejects an incorrect password with 401", async () => {
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue(makeUser())
      },
      refreshToken: {
        create: jest.fn()
      }
    };

    await expect(
      loginUser(db, {
        email: "learner@example.com",
        password: "WrongPassword!",
        jwtSecret
      })
    ).rejects.toMatchObject(new AuthError(401, "INVALID_CREDENTIALS"));
  });

  test("refreshes an access token using an active refresh token", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const db = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: "refresh_1",
          tokenHash: "refresh-token",
          userId: "user_1",
          revokedAt: null,
          expiresAt,
          user: makeUser()
        })
      }
    };

    const result = await refreshAccessToken(db, {
      refreshToken: "refresh-token",
      jwtSecret
    });

    const payload = await verifyAccessToken(result.accessToken, jwtSecret);
    expect(result.status).toBe(200);
    expect(payload.sub).toBe("user_1");
  });
});
