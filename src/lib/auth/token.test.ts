import { signAccessToken, verifyAccessToken } from "./token";

const jwtSecret = "test-secret-that-is-long-enough-for-hs256";

describe("access tokens", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("signs a token that remains valid before 24 hours", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-08T00:00:00.000Z"));
    const token = await signAccessToken(
      {
        sub: "user_1",
        email: "learner@example.com"
      },
      jwtSecret
    );

    jest.setSystemTime(new Date("2026-05-08T23:59:00.000Z"));

    await expect(verifyAccessToken(token, jwtSecret)).resolves.toMatchObject({
      sub: "user_1",
      email: "learner@example.com"
    });
  });

  test("rejects a token after 24 hours", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-08T00:00:00.000Z"));
    const token = await signAccessToken(
      {
        sub: "user_1",
        email: "learner@example.com"
      },
      jwtSecret
    );

    jest.setSystemTime(new Date("2026-05-09T00:00:01.000Z"));

    await expect(verifyAccessToken(token, jwtSecret)).rejects.toThrow("JWT expired");
  });
});
