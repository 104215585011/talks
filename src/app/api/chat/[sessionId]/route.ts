import { jsonError, handleApiError } from "@/lib/api/http";
import { authenticateRequest } from "@/lib/auth/request-auth";
import { prisma } from "@/lib/db/client";

type RouteContext = {
  params: {
    sessionId: string;
  };
};

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateRequest(request);

  if (!auth) {
    return jsonError(401, "UNAUTHORIZED", "Authentication is required");
  }

  try {
    const result = await prisma.session.deleteMany({
      where: {
        id: context.params.sessionId,
        userId: auth.userId
      }
    });

    if (result.count === 0) {
      return jsonError(404, "SESSION_NOT_FOUND", "Session not found");
    }

    return Response.json({
      deleted: true
    });
  } catch (error) {
    return handleApiError(error);
  }
}
