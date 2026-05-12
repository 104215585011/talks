import { POST } from "./route";
import { signAccessToken } from "@/lib/auth/token";
import { streamChatMessage, type ChatStreamEvent } from "@/lib/chat/chat-service";

const jwtSecret = "test-secret-that-is-long-enough-for-hs256";

jest.mock("@/lib/chat/chat-service", () => ({
  streamChatMessage: jest.fn()
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    session: {
      findFirst: jest.fn()
    }
  }
}));

function makeRequest(body: unknown, token?: string) {
  const headers = new Headers({
    "content-type": "application/json"
  });

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return new Request("http://localhost/api/chat/message", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

async function readResponseText(response: Response) {
  return await response.text();
}

describe("chat message API route", () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  afterEach(() => {
    process.env.JWT_SECRET = previousJwtSecret;
    jest.clearAllMocks();
  });

  test("POST /api/chat/message returns 401 without a JWT", async () => {
    const response = await POST(
      makeRequest({
        characterId: "emma",
        message: "Hello"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(streamChatMessage).not.toHaveBeenCalled();
  });

  test("POST /api/chat/message streams deltas and done events for authenticated users", async () => {
    jest.mocked(streamChatMessage).mockImplementation(async function* (): AsyncGenerator<ChatStreamEvent> {
      yield { type: "delta", text: "Hi" };
      yield { type: "delta", text: " there" };
      yield {
        type: "done",
        assistantText: "Hi there",
        sessionId: "session_1",
        corrections: ["Say: Hello there."],
        newWords: ["there"]
      };
    });
    const token = await signAccessToken(
      {
        sub: "user_1",
        email: "learner@example.com"
      },
      jwtSecret
    );

    const response = await POST(
      makeRequest(
        {
          characterId: "emma",
          message: "Hello"
        },
        token
      )
    );
    const text = await readResponseText(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(text).toContain('event: delta\ndata: {"text":"Hi"}');
    expect(text).toContain('event: delta\ndata: {"text":" there"}');
    expect(text).toContain(
      'event: done\ndata: {"assistantText":"Hi there","sessionId":"session_1","corrections":["Say: Hello there."],"newWords":["there"]}'
    );
    expect(streamChatMessage).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        userId: "user_1",
        characterId: "emma",
        message: "Hello"
      })
    );
  });
});
