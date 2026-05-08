import { z } from "zod";
import { handleApiError, getJwtSecret, rateLimitError } from "@/lib/api/http";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/db/client";
import { registerUser } from "@/lib/auth/auth-service";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional()
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, { limit: 10, windowMs: 60_000 });

  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  try {
    const body = registerSchema.parse(await request.json());
    const result = await registerUser(prisma, {
      ...body,
      jwtSecret: getJwtSecret()
    });

    return Response.json(result, { status: result.status });
  } catch (error) {
    return handleApiError(error);
  }
}
