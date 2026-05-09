/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "./MessageBubble";

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>
}));

jest.mock("./AudioWaveform", () => ({
  AudioWaveform: () => <div data-testid="audio-waveform" />
}));

describe("MessageBubble", () => {
  it("uses a cyan glass edge for assistant messages", () => {
    render(
      <MessageBubble
        characterName="Emma Clarke"
        message={{ id: "assistant-1", role: "assistant", content: "Good evening." }}
      />
    );

    const bubble = screen.getByText("Good evening.").parentElement;

    expect(bubble).toHaveClass("border-l-2");
    expect(bubble).toHaveClass("border-l-brand-accent");
  });

  it("uses a solid highlighted edge for user messages", () => {
    render(
      <MessageBubble
        characterName="Emma Clarke"
        message={{ id: "user-1", role: "user", content: "Hello." }}
      />
    );

    const bubble = screen.getByText("Hello.").parentElement;

    expect(bubble).toHaveClass("before:w-1");
    expect(bubble).toHaveClass("before:bg-white/55");
  });
});
