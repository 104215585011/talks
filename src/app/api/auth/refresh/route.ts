import { z } from "zod";
import { handleApiError, getJwtSecret } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db/client";

const refreshSchema = z.object({
  refreshToken: z.string().min(16)
});

export async function POST(request: Request) {
  try {
    const body = refreshSchema.parse(await request.json());
    const result = await refreshAccessToken(prisma, {
      refreshToken: body.refreshToken,
      jwtSecret: getJwtSecret()
    });

    return Response.json(result, { status: result.status });
  } catch (error) {
    return handleApiError(error);
  }
}
