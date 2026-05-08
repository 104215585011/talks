import { z } from "zod";
import { jsonError, handleApiError } from "@/lib/api/http";
import { authenticateRequest } from "@/lib/auth/request-auth";
import { createSpeechRecognizer, SUPPORTED_ASR_LANGUAGES } from "@/lib/speech/speech-service";

const recognizeSchema = z.object({
  audioBase64: z.string().min(1),
  language: z.enum(SUPPORTED_ASR_LANGUAGES),
  mimeType: z.string().min(1).max(80)
});

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth) {
    return jsonError(401, "UNAUTHORIZED", "Authentication is required");
  }

  try {
    const body = recognizeSchema.parse(await request.json());
    const result = await createSpeechRecognizer().recognize(body);

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
