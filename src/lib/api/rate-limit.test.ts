import {
  checkRateLimit,
  resetRateLimitForTests,
  setRateLimitRedisClientForTests
} from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  test("allows requests within the configured window", async () => {
    const request = new Request("https://linguaai.test/api/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.10"
      }
    });

    await expect(checkRateLimit(request, { limit: 2, windowMs: 60_000 })).resolves.toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0
    });
    await expect(checkRateLimit(request, { limit: 2, windowMs: 60_000 })).resolves.toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0
    });
  });

  test("blocks requests after the configured limit", async () => {
    const request = new Request("https://linguaai.test/api/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.11"
      }
    });

    await checkRateLimit(request, { limit: 1, windowMs: 60_000 });

    await expect(checkRateLimit(request, { limit: 1, windowMs: 60_000 })).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60
    });
  });

  test("uses Redis counters when a distributed client is configured", async () => {
    const evalMock = jest.fn().mockResolvedValue([2, 42_000]);
    const request = new Request("https://linguaai.test/api/chat/message", {
      headers: {
        "x-forwarded-for": "203.0.113.12"
      }
    });

    setRateLimitRedisClientForTests({
      eval: evalMock,
      isOpen: true
    });

    await expect(checkRateLimit(request, { limit: 3, windowMs: 60_000 })).resolves.toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0
    });
    expect(evalMock).toHaveBeenCalledWith(expect.stringContaining("INCR"), {
      arguments: ["60000"],
      keys: ["rate-limit:203.0.113.12:/api/chat/message"]
    });
  });

  test("falls back to local buckets when Redis is unavailable", async () => {
    const request = new Request("https://linguaai.test/api/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.13"
      }
    });

    setRateLimitRedisClientForTests({
      eval: jest.fn().mockRejectedValue(new Error("redis unavailable")),
      isOpen: true
    });

    await expect(checkRateLimit(request, { limit: 1, windowMs: 60_000 })).resolves.toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0
    });
    await expect(checkRateLimit(request, { limit: 1, windowMs: 60_000 })).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60
    });
  });
});
