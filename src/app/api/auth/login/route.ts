import { z } from "zod";
import { handleApiError, getJwtSecret, rateLimitError } from "@/lib/api/http";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { loginUser } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128)
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, { limit: 20, windowMs: 60_000 });

  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  try {
    const body = loginSchema.parse(await request.json());
    const result = await loginUser(prisma, {
      ...body,
      jwtSecret: getJwtSecret()
    });

    return Response.json(result, { status: result.status });
  } catch (error) {
    return handleApiError(error);
  }
}
