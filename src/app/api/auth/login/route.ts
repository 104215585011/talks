import { z } from "zod";
import { handleApiError, getJwtSecret } from "@/lib/api/http";
import { loginUser } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128)
});

export async function POST(request: Request) {
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
