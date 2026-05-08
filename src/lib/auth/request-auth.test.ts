import { authenticateRequest } from "./request-auth";
import { signAccessToken } from "./token";

const jwtSecret = "test-secret-that-is-long-enough-for-hs256";

describe("request authentication", () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  afterEach(() => {
    process.env.JWT_SECRET = previousJwtSecret;
  });

  test("returns null when the Bearer header is missing", async () => {
    const request = new Request("http://localhost/api/chat/message");

    await expect(authenticateRequest(request)).resolves.toBeNull();
  });

  test("returns null for an invalid JWT", async () => {
    const request = new Request("http://localhost/api/chat/message", {
      headers: {
        authorization: "Bearer not-a-valid-token"
      }
    });

    await expect(authenticateRequest(request)).resolves.toBeNull();
  });

  test("returns user identity for a valid JWT", async () => {
    const token = await signAccessToken(
      {
        sub: "user_1",
        email: "learner@example.com"
      },
      jwtSecret
    );
    const request = new Request("http://localhost/api/chat/message", {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    await expect(authenticateRequest(request)).resolves.toEqual({
      userId: "user_1",
      email: "learner@example.com"
    });
  });
});
