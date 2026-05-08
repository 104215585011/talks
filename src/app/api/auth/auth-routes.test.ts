import bcrypt from "bcryptjs";
import { POST as login } from "./login/route";
import { POST as register } from "./register/route";
import { verifyAccessToken } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db/client";

const jwtSecret = "test-secret-that-is-long-enough-for-hs256";
const now = new Date("2026-05-08T00:00:00.000Z");

jest.mock("@/lib/db/client", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    refreshToken: {
      create: jest.fn()
    }
  }
}));

const mockPrisma = jest.mocked(prisma);

function makeRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

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
    ...overrides
  };
}

function makeRefreshToken() {
  return {
    id: "refresh_1",
    tokenHash: "hashed-refresh-token",
    userId: "user_1",
    expiresAt: new Date("2026-06-08T00:00:00.000Z"),
    revokedAt: null,
    createdAt: now
  };
}

describe("auth API routes", () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  afterEach(() => {
    process.env.JWT_SECRET = previousJwtSecret;
    jest.clearAllMocks();
  });

  test("POST /api/auth/register rejects duplicate emails", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());

    const response = await register(
      makeRequest("/api/auth/register", {
        email: "learner@example.com",
        password: "Password123!"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  test("POST /api/auth/register rejects missing fields", async () => {
    const response = await register(
      makeRequest("/api/auth/register", {
        email: "learner@example.com"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("POST /api/auth/register creates an account and returns tokens", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(makeUser());
    mockPrisma.refreshToken.create.mockResolvedValue(makeRefreshToken());

    const response = await register(
      makeRequest("/api/auth/register", {
        email: "learner@example.com",
        password: "Password123!",
        name: "Learner"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.user).toEqual({
      id: "user_1",
      email: "learner@example.com",
      name: "Learner"
    });
    expect(body.accessToken).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(body.refreshToken).toEqual(expect.any(String));
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "learner@example.com",
        passwordHash: expect.stringMatching(/^\$2/)
      })
    });
  });

  test("POST /api/auth/login rejects an incorrect password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());

    const response = await login(
      makeRequest("/api/auth/login", {
        email: "learner@example.com",
        password: "WrongPassword!"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  test("POST /api/auth/login returns a valid JWT for correct credentials", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    mockPrisma.refreshToken.create.mockResolvedValue(makeRefreshToken());

    const response = await login(
      makeRequest("/api/auth/login", {
        email: "learner@example.com",
        password: "Password123!"
      })
    );
    const body = await response.json();
    const payload = await verifyAccessToken(body.accessToken, jwtSecret);

    expect(response.status).toBe(200);
    expect(body.accessToken).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(payload).toEqual({
      sub: "user_1",
      email: "learner@example.com"
    });
  });
});
