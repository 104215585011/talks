import { z } from "zod";
import { jsonError, handleApiError } from "@/lib/api/http";
import { authenticateRequest } from "@/lib/auth/request-auth";
import { getMessageEncryptionSecret } from "@/lib/chat/env";
import { listUserHistory } from "@/lib/chat/history-service";
import { prisma } from "@/lib/db/client";

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
});

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth) {
    return jsonError(401, "UNAUTHORIZED", "Authentication is required");
  }

  try {
    const url = new URL(request.url);
    const query = historyQuerySchema.parse(Object.fromEntries(url.searchParams));
    const history = await listUserHistory(prisma, {
      userId: auth.userId,
      page: query.page,
      pageSize: query.pageSize,
      encryptionSecret: getMessageEncryptionSecret()
    });

    return Response.json(history);
  } catch (error) {
    return handleApiError(error);
  }
}
