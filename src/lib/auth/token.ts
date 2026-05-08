import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24;
const REFRESH_TOKEN_TTL_DAYS = 30;

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

type JwtPayload = AccessTokenPayload & {
  iat: number;
  exp: number;
};

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signJwtInput(input: string, secret: string) {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export async function signAccessToken(payload: AccessTokenPayload, secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(
    JSON.stringify({
      sub: payload.sub,
      email: payload.email,
      iat: now,
      exp: now + ACCESS_TOKEN_TTL_SECONDS
    } satisfies JwtPayload)
  );
  const signature = signJwtInput(`${header}.${body}`, secret);

  return `${header}.${body}.${signature}`;
}

export async function verifyAccessToken(token: string, secret: string) {
  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature) {
    throw new Error("Invalid JWT");
  }

  const expectedSignature = signJwtInput(`${header}.${body}`, secret);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid JWT signature");
  }

  const payload = JSON.parse(decodeBase64Url(body)) as JwtPayload;

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("JWT expired");
  }

  return {
    sub: payload.sub,
    email: payload.email
  };
}

export function createRefreshToken() {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}
