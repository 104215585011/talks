import { Prisma, type PrismaClient, type User } from "@prisma/client";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./password";
import {
  createRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken
} from "./token";

const emailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.string().email()
);
const passwordSchema = z.string().min(8).max(128);

type TokenIssueDb = {
  refreshToken: Pick<PrismaClient["refreshToken"], "create">;
};

type RegisterDb = TokenIssueDb & {
  user: Pick<PrismaClient["user"], "findUnique" | "create">;
};

type LoginDb = TokenIssueDb & {
  user: Pick<PrismaClient["user"], "findUnique">;
};

export class AuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = code
  ) {
    super(message);
  }
}

export type AuthResult = {
  status: 200 | 201;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  accessToken: string;
  refreshToken: string;
};

type RegisterInput = {
  email: string;
  password: string;
  name?: string;
  jwtSecret: string;
};

type LoginInput = {
  email: string;
  password: string;
  jwtSecret: string;
};

type RefreshInput = {
  refreshToken: string;
  jwtSecret: string;
};

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

async function issueTokens(db: TokenIssueDb, user: User, jwtSecret: string) {
  const refreshToken = createRefreshToken();

  await db.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: getRefreshTokenExpiry()
    }
  });

  return {
    accessToken: await signAccessToken({ sub: user.id, email: user.email }, jwtSecret),
    refreshToken
  };
}

export async function registerUser(db: RegisterDb, input: RegisterInput): Promise<AuthResult> {
  const email = emailSchema.parse(input.email);
  const password = passwordSchema.parse(input.password);

  const existingUser = await db.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AuthError(409, "EMAIL_ALREADY_EXISTS");
  }

  try {
    const user = await db.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: await hashPassword(password)
      }
    });
    const tokens = await issueTokens(db, user, input.jwtSecret);

    return {
      status: 201,
      user: toPublicUser(user),
      ...tokens
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AuthError(409, "EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function loginUser(db: LoginDb, input: LoginInput): Promise<AuthResult> {
  const email = emailSchema.parse(input.email);
  const password = passwordSchema.parse(input.password);
  const user = await db.user.findUnique({
    where: { email }
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthError(401, "INVALID_CREDENTIALS");
  }

  const tokens = await issueTokens(db, user, input.jwtSecret);

  return {
    status: 200,
    user: toPublicUser(user),
    ...tokens
  };
}

export async function refreshAccessToken(
  db: {
    refreshToken: Pick<PrismaClient["refreshToken"], "findUnique">;
  },
  input: RefreshInput
) {
  const token = await db.refreshToken.findUnique({
    where: {
      tokenHash: hashRefreshToken(input.refreshToken)
    },
    include: {
      user: true
    }
  });

  if (!token || token.revokedAt || token.expiresAt <= new Date()) {
    throw new AuthError(401, "INVALID_REFRESH_TOKEN");
  }

  return {
    status: 200 as const,
    accessToken: await signAccessToken(
      {
        sub: token.user.id,
        email: token.user.email
      },
      input.jwtSecret
    )
  };
}

export { verifyAccessToken };
