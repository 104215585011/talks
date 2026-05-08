import { jsonError, handleApiError } from "@/lib/api/http";
import { authenticateRequest } from "@/lib/auth/request-auth";
import { prisma } from "@/lib/db/client";
import { buildUserStats } from "@/lib/stats/user-stats";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth) {
    return jsonError(401, "UNAUTHORIZED", "Authentication is required");
  }

  try {
    return Response.json(await buildUserStats(prisma, { userId: auth.userId }));
  } catch (error) {
    return handleApiError(error);
  }
}
