/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  MessageBubble: ({ message }: { message: { content: string } }) => <div>{message.content}</div>
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
});
