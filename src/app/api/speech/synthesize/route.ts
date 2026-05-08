import { z } from "zod";
import { jsonError, handleApiError, rateLimitError } from "@/lib/api/http";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { authenticateRequest } from "@/lib/auth/request-auth";
import { createSpeechSynthesizer } from "@/lib/speech/speech-service";

const synthesizeSchema = z.object({
  characterId: z.string().min(1),
  text: z.string().min(1).max(2000)
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, { limit: 60, windowMs: 60_000 });

  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const auth = await authenticateRequest(request);

  if (!auth) {
    return jsonError(401, "UNAUTHORIZED", "Authentication is required");
  }

  try {
    const body = synthesizeSchema.parse(await request.json());
    const result = await createSpeechSynthesizer().synthesize(body);

    return new Response(result.stream, {
      headers: {
        "cache-control": "no-store",
        "content-type": result.contentType,
        "x-speech-provider": result.provider
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unsupported character voice") {
      return jsonError(404, "CHARACTER_NOT_FOUND", "Character voice not found");
    }

    return handleApiError(error);
  }
}
