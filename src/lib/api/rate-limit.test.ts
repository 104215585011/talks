import { checkRateLimit, resetRateLimitForTests } from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  test("allows requests within the configured window", () => {
    const request = new Request("https://linguaai.test/api/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.10"
      }
    });

    expect(checkRateLimit(request, { limit: 2, windowMs: 60_000 })).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 0
    });
    expect(checkRateLimit(request, { limit: 2, windowMs: 60_000 })).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 0
    });
  });

  test("blocks requests after the configured limit", () => {
    const request = new Request("https://linguaai.test/api/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.11"
      }
    });

    checkRateLimit(request, { limit: 1, windowMs: 60_000 });

    expect(checkRateLimit(request, { limit: 1, windowMs: 60_000 })).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60
    });
  });
});
