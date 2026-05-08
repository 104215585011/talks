import { ZodError } from "zod";

export function jsonError(status: number, code: string, message: string) {
  return Response.json(
    {
      error: {
        code,
        message
      }
    },
    { status }
  );
}

export function rateLimitError(retryAfterSeconds: number) {
  return Response.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests"
      }
    },
    {
      headers: {
        "retry-after": String(retryAfterSeconds)
      },
      status: 429
    }
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(422, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request body");
  }

  if (error instanceof Error && "status" in error && "code" in error) {
    const authError = error as Error & { status: number; code: string };
    return jsonError(authError.status, authError.code, authError.message);
  }

  return jsonError(500, "INTERNAL_SERVER_ERROR", "Unexpected server error");
}

export function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  return jwtSecret;
}
