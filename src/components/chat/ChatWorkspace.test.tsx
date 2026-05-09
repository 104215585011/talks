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
  useRouter: () => ({ replace })
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

  it("opens a compact mentor drawer and closes it after selecting a character", async () => {
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
    global.fetch = jest.fn(async () => {
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
});
