/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "node:util";
import { ChatWorkspace } from "./ChatWorkspace";
import type { LinguaCharacter } from "@/lib/characters/characters";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace })
}));

jest.mock("@/lib/auth/client-session", () => ({
  readAuthSession: () => ({
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    user: { id: "user-1", email: "qa@example.com" }
  })
}));

jest.mock("@/lib/speech/browser-audio", () => ({
  playAudioResponse: jest.fn()
}));

jest.mock("./MessageBubble", () => ({
  MessageBubble: ({
    isStreaming,
    message
  }: {
    isStreaming?: boolean;
    message: { content: string; role: string };
  }) =>
    isStreaming && message.role === "assistant" && !message.content ? (
      <div aria-label="AI is typing" />
    ) : (
      <div>{message.content}</div>
    )
}));

const characters: LinguaCharacter[] = [
  {
    bio: "Oxford professor",
    id: "emma",
    language: "English (UK)",
    name: "Emma Clarke",
    style: "Measured British English",
    systemPrompt: "You are Emma.",
    voice: "emma"
  },
  {
    bio: "New York product manager",
    id: "jake",
    language: "English (US)",
    name: "Jake Wilson",
    style: "Fast American English",
    systemPrompt: "You are Jake.",
    voice: "jake"
  }
];

describe("ChatWorkspace mobile mentor drawer", () => {
  beforeEach(() => {
    replace.mockClear();
    jest.restoreAllMocks();
    delete (global as { fetch?: unknown }).fetch;
    window.localStorage.clear();
  });

  function mockEmptyHistory() {
    global.fetch = jest.fn(async () => ({
      json: async () => ({ page: 1, pageSize: 20, sessions: [], total: 0 }),
      ok: true
    })) as jest.Mock;
  }

  it("opens a compact mentor drawer and closes it after selecting a character", async () => {
    mockEmptyHistory();
    render(<ChatWorkspace characters={characters} />);

    await waitFor(() => expect(screen.getAllByText("Emma Clarke").length).toBeGreaterThan(0));

    const openButton = screen.getByRole("button", { name: "Choose mentor" });
    expect(openButton).toHaveClass("lg:hidden");

    fireEvent.click(openButton);

    const drawer = screen.getByRole("dialog", { name: "Choose mentor" });
    expect(drawer).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole("button", { name: /Jake Wilson/ }));

    expect(screen.queryByRole("dialog", { name: "Choose mentor" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Jake Wilson").length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("linguaai.characterId")).toBe("jake");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it("renders a subtle atmospheric background layer behind the chat workspace", async () => {
    mockEmptyHistory();
    render(<ChatWorkspace characters={characters} />);

    expect(await screen.findByTestId("chat-atmosphere")).toHaveClass("bg-chat-atmosphere");
  });

  it("keeps messages and learning notes isolated per character while switching mentors", async () => {
    Object.assign(global, { TextDecoder, TextEncoder });
    let uuid = 0;
    Object.defineProperty(global, "crypto", {
      configurable: true,
      value: {
        randomUUID: () => `message-${++uuid}`
      }
    });
    global.fetch = jest.fn(async (_input, init) => {
      if (!init?.body) {
        return {
          json: async () => ({ page: 1, pageSize: 20, sessions: [], total: 0 }),
          ok: true
        } as Response;
      }

      const body = JSON.parse(String(init?.body ?? "{}")) as { characterId: string };
      const encoder = new TextEncoder();
      const reply = body.characterId === "emma" ? "Emma reply" : "Jake reply";
      const correction =
        body.characterId === "emma" ? "Emma correction" : "Jake correction";
      const chunk = encoder.encode(
        `event: delta\ndata: ${JSON.stringify({ text: reply })}\n\n` +
          `event: done\ndata: ${JSON.stringify({
            corrections: [correction],
            newWords: [`${body.characterId}-word`],
            sessionId: `${body.characterId}-session`
          })}\n\n`
      );
      let hasRead = false;

      return {
        body: {
          getReader: () => ({
            read: async () => {
              if (hasRead) {
                return { done: true, value: undefined };
              }

              hasRead = true;
              return { done: false, value: chunk };
            }
          })
        },
        ok: true
      } as Response;
    }) as jest.Mock;

    render(<ChatWorkspace characters={characters} />);

    await waitFor(() => expect(screen.getAllByText("Emma Clarke").length).toBeGreaterThan(0));

    fireEvent.change(screen.getByPlaceholderText("Message Emma Clarke"), {
      target: { value: "Hello Emma" }
    });
    fireEvent.submit(screen.getByPlaceholderText("Message Emma Clarke").closest("form")!);

    await screen.findByText("Emma reply");
    expect(screen.getByText("Emma correction")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Jake Wilson/ })[0]);

    expect(screen.queryByText("Hello Emma")).not.toBeInTheDocument();
    expect(screen.queryByText("Emma reply")).not.toBeInTheDocument();
    expect(screen.queryByText("Emma correction")).not.toBeInTheDocument();
    expect(screen.getByText("Start with one sentence.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Message Jake Wilson"), {
      target: { value: "Hello Jake" }
    });
    fireEvent.submit(screen.getByPlaceholderText("Message Jake Wilson").closest("form")!);

    await screen.findByText("Jake reply");
    expect(screen.getByText("Jake correction")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Emma Clarke/ })[0]);

    expect(screen.getByText("Hello Emma")).toBeInTheDocument();
    expect(screen.getByText("Emma reply")).toBeInTheDocument();
    expect(screen.getByText("Emma correction")).toBeInTheDocument();
    expect(screen.queryByText("Hello Jake")).not.toBeInTheDocument();
    expect(screen.queryByText("Jake reply")).not.toBeInTheDocument();
  });

  it("renders a typing indicator before the first streamed delta arrives", async () => {
    Object.assign(global, { TextDecoder, TextEncoder });
    let uuid = 0;
    let releaseStream: (() => void) | undefined;
    Object.defineProperty(global, "crypto", {
      configurable: true,
      value: {
        randomUUID: () => `typing-message-${++uuid}`
      }
    });
    global.fetch = jest.fn(async (_input, init) => {
      if (!init?.body) {
        return {
          json: async () => ({ page: 1, pageSize: 20, sessions: [], total: 0 }),
          ok: true
        } as Response;
      }

      const encoder = new TextEncoder();
      let hasRead = false;

      return {
        body: {
          getReader: () => ({
            read: async () => {
              if (hasRead) {
                return { done: true, value: undefined };
              }

              await new Promise<void>((resolve) => {
                releaseStream = resolve;
              });
              hasRead = true;
              return {
                done: false,
                value: encoder.encode('event: delta\ndata: {"text":"Delayed reply"}\n\n')
              };
            }
          })
        },
        ok: true
      } as Response;
    }) as jest.Mock;

    render(<ChatWorkspace characters={characters} />);

    await waitFor(() => expect(screen.getAllByText("Emma Clarke").length).toBeGreaterThan(0));

    fireEvent.change(screen.getByPlaceholderText("Message Emma Clarke"), {
      target: { value: "Hello" }
    });
    fireEvent.submit(screen.getByPlaceholderText("Message Emma Clarke").closest("form")!);

    expect(await screen.findByLabelText("AI is typing")).toBeInTheDocument();

    releaseStream?.();

    expect(await screen.findByText("Delayed reply")).toBeInTheDocument();
    expect(screen.queryByLabelText("AI is typing")).not.toBeInTheDocument();
  });

  it("loads the latest stored session for the selected character and continues it", async () => {
    Object.assign(global, { TextDecoder, TextEncoder });
    let uuid = 0;
    Object.defineProperty(global, "crypto", {
      configurable: true,
      value: {
        randomUUID: () => `history-message-${++uuid}`
      }
    });
    const fetchMock = jest.fn(async (_input, init) => {
      if (!init?.body) {
        return {
          json: async () => ({
            page: 1,
            pageSize: 20,
            total: 1,
            sessions: [
              {
                id: "emma-session",
                characterId: "emma",
                hasMoreMessages: false,
                messages: [
                  {
                    id: "stored-user",
                    role: "USER",
                    content: "Stored hello",
                    createdAt: "2026-05-08T00:00:00.000Z"
                  },
                  {
                    id: "stored-assistant",
                    role: "ASSISTANT",
                    content: "Stored reply",
                    createdAt: "2026-05-08T00:00:01.000Z"
                  }
                ]
              }
            ]
          }),
          ok: true
        } as Response;
      }

      const body = JSON.parse(String(init.body)) as { sessionId?: string };
      const encoder = new TextEncoder();

      return {
        body: {
          getReader: () => ({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: encoder.encode(
                  `event: done\ndata: ${JSON.stringify({
                    corrections: [],
                    newWords: [],
                    sessionId: body.sessionId
                  })}\n\n`
                )
              })
              .mockResolvedValueOnce({ done: true, value: undefined })
          })
        },
        ok: true
      } as Response;
    });
    global.fetch = fetchMock as jest.Mock;

    render(<ChatWorkspace characters={characters} />);

    expect(await screen.findByText("Stored hello")).toBeInTheDocument();
    expect(screen.getByText("Stored reply")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Message Emma Clarke"), {
      target: { value: "Continue" }
    });
    fireEvent.submit(screen.getByPlaceholderText("Message Emma Clarke").closest("form")!);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([, init]) => init?.body);
      expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
        sessionId: "emma-session"
      });
    });
  });

  it("loads earlier messages for the active session without replacing current messages", async () => {
    Object.assign(global, { TextDecoder, TextEncoder });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          page: 1,
          pageSize: 20,
          total: 1,
          sessions: [
            {
              id: "emma-session",
              characterId: "emma",
              hasMoreMessages: true,
              messages: [
                {
                  id: "newer-user",
                  role: "USER",
                  content: "Newer stored hello",
                  createdAt: "2026-05-08T00:00:10.000Z"
                }
              ]
            }
          ]
        }),
        ok: true
      })
      .mockResolvedValueOnce({
        json: async () => ({
          page: 2,
          pageSize: 20,
          total: 1,
          sessions: [
            {
              id: "emma-session",
              characterId: "emma",
              hasMoreMessages: false,
              messages: [
                {
                  id: "older-user",
                  role: "USER",
                  content: "Older stored hello",
                  createdAt: "2026-05-07T00:00:10.000Z"
                }
              ]
            }
          ]
        }),
        ok: true
      });
    global.fetch = fetchMock as jest.Mock;

    render(<ChatWorkspace characters={characters} />);

    expect(await screen.findByText("Newer stored hello")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load earlier messages" }));

    expect(await screen.findByText("Older stored hello")).toBeInTheDocument();
    expect(screen.getByText("Newer stored hello")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load earlier messages" })).not.toBeInTheDocument();
  });

  it("shows a new message jump button when streaming continues while the user is reading history", async () => {
    Object.assign(global, { TextDecoder, TextEncoder });
    Object.defineProperty(global, "crypto", {
      configurable: true,
      value: {
        randomUUID: jest.fn().mockReturnValueOnce("user-message").mockReturnValueOnce("assistant-message")
      }
    });
    Element.prototype.scrollIntoView = jest.fn();

    let releaseDelta: (value: unknown) => void = () => undefined;
    const deltaRead = new Promise((resolve) => {
      releaseDelta = resolve;
    });
    const encoder = new TextEncoder();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ page: 1, pageSize: 20, sessions: [], total: 0 }),
        ok: true
      })
      .mockResolvedValueOnce({
        body: {
          getReader: () => ({
            read: jest
              .fn()
              .mockReturnValueOnce(deltaRead)
              .mockResolvedValueOnce({ done: true, value: undefined })
          })
        },
        ok: true
      }) as jest.Mock;

    render(<ChatWorkspace characters={characters} />);

    fireEvent.change(await screen.findByPlaceholderText("Message Emma Clarke"), {
      target: { value: "Hello from the top" }
    });
    fireEvent.submit(screen.getByPlaceholderText("Message Emma Clarke").closest("form")!);

    const messageContainer = await screen.findByTestId("chat-message-scroll");
    Object.defineProperties(messageContainer, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 120, writable: true }
    });
    fireEvent.scroll(messageContainer);

    releaseDelta({
      done: false,
      value: encoder.encode("event: delta\ndata: {\"text\":\"Streaming reply\"}\n\n")
    });

    expect(await screen.findByRole("button", { name: "Jump to latest message" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Jump to latest message" }));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "end"
    });
    expect(screen.queryByRole("button", { name: "Jump to latest message" })).not.toBeInTheDocument();
  });
});
