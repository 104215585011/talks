import { z } from "zod";
import { handleApiError, getJwtSecret } from "@/lib/api/http";
import { prisma } from "@/lib/db/client";
import { registerUser } from "@/lib/auth/auth-service";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional()
});

export async function POST(request: Request) {
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
