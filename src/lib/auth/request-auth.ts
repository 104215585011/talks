import { getJwtSecret } from "@/lib/api/http";
import { verifyAccessToken } from "./auth-service";

export async function authenticateRequest(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(authorization.slice("Bearer ".length), getJwtSecret());

    if (!payload.sub || typeof payload.email !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email
    };
  } catch {
    return null;
  }
}
