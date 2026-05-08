import { z } from "zod";
import { jsonError, handleApiError, rateLimitError } from "@/lib/api/http";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { authenticateRequest } from "@/lib/auth/request-auth";
import { getCharacterById } from "@/lib/characters/characters";
import { getMessageEncryptionSecret } from "@/lib/chat/env";
import { streamChatMessage } from "@/lib/chat/chat-service";
import { prisma } from "@/lib/db/client";

const chatMessageSchema = z.object({
  characterId: z.string().min(1),
  message: z.string().min(1).max(4000),
  sessionId: z.string().min(1).optional()
});

const encoder = new TextEncoder();

function encodeSse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, { limit: 60, windowMs: 60_000 });

  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const auth = await authenticateRequest(request);

  if (!auth) {
    return jsonError(401, "UNAUTHORIZED", "Authentication is required");
  }

  try {
    const body = chatMessageSchema.parse(await request.json());

    if (!getCharacterById(body.characterId)) {
      return jsonError(404, "CHARACTER_NOT_FOUND", "Character not found");
    }

    if (body.sessionId) {
      const session = await prisma.session.findFirst({
        where: {
          id: body.sessionId,
          userId: auth.userId
        }
      });

      if (!session) {
        return jsonError(404, "SESSION_NOT_FOUND", "Session not found");
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamChatMessage(prisma, {
            userId: auth.userId,
            characterId: body.characterId,
            message: body.message,
            sessionId: body.sessionId,
            encryptionSecret: getMessageEncryptionSecret()
          })) {
            if (event.type === "delta") {
              controller.enqueue(encodeSse("delta", { text: event.text }));
            } else {
              controller.enqueue(
                encodeSse("done", {
                  sessionId: event.sessionId,
                  corrections: event.corrections,
                  newWords: event.newWords
                })
              );
            }
          }

          controller.close();
        } catch (error) {
          controller.enqueue(
            encodeSse("error", {
              message: error instanceof Error ? error.message : "Chat failed"
            })
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive"
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
