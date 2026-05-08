import { createClient } from "redis";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RedisRateLimitClient = {
  connect?: () => Promise<unknown>;
  eval: (
    script: string,
    options: {
      arguments: string[];
      keys: string[];
    }
  ) => Promise<unknown>;
  isOpen?: boolean;
};

const REDIS_RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

const buckets = new Map<string, RateLimitBucket>();
let redisClient: RedisRateLimitClient | null | undefined;
let redisClientForTests: RedisRateLimitClient | null | undefined;

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export async function checkRateLimit(
  request: Request,
  { limit, windowMs }: RateLimitOptions
): Promise<RateLimitResult> {
  const key = getRateLimitKey(request);
  const redis = getRedisClient();

  if (redis) {
    try {
      if (redis.connect && redis.isOpen === false) {
        await redis.connect();
      }

      const result = await redis.eval(REDIS_RATE_LIMIT_SCRIPT, {
        arguments: [String(windowMs)],
        keys: [key]
      });
      const [count, ttlMs] = parseRedisResult(result);

      return toRateLimitResult({ count, limit, ttlMs, windowMs });
    } catch {
      return checkLocalRateLimit(key, { limit, windowMs });
    }
  }

  return checkLocalRateLimit(key, { limit, windowMs });
}

function checkLocalRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: 0
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: 0
  };
}

function getRateLimitKey(request: Request) {
  const url = new URL(request.url);
  return `rate-limit:${getClientIp(request)}:${url.pathname}`;
}

function getRedisClient() {
  if (redisClientForTests !== undefined) {
    return redisClientForTests;
  }

  if (!process.env.REDIS_URL) {
    return null;
  }

  if (redisClient === undefined) {
    const client = createClient({
      socket: {
        connectTimeout: 300,
        reconnectStrategy: false
      },
      url: process.env.REDIS_URL
    });
    client.on("error", () => undefined);
    redisClient = client as RedisRateLimitClient;
  }

  return redisClient;
}

function parseRedisResult(result: unknown) {
  if (!Array.isArray(result) || result.length < 2) {
    throw new Error("Invalid Redis rate-limit response");
  }

  return [Number(result[0]), Number(result[1])] as const;
}

function toRateLimitResult({
  count,
  limit,
  ttlMs,
  windowMs
}: {
  count: number;
  limit: number;
  ttlMs: number;
  windowMs: number;
}): RateLimitResult {
  const retryAfterSeconds = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000));

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: 0
  };
}

export function resetRateLimitForTests() {
  buckets.clear();
  redisClientForTests = undefined;
}

export function setRateLimitRedisClientForTests(client: RedisRateLimitClient | null) {
  redisClientForTests = client;
}
