/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { MessageBubble } from "./MessageBubble";

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>
}));

jest.mock("./AudioWaveform", () => ({
  AudioWaveform: () => <div data-testid="audio-waveform" />
}));

describe("MessageBubble", () => {
  let scrollHeightSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    scrollHeightSpy = jest.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
      function getScrollHeight() {
        return this.dataset.testid === "assistant-message-content" ? 320 : 120;
      }
    );
  });

  afterEach(() => {
    scrollHeightSpy.mockRestore();
  });

  it("uses a cyan glass edge for assistant messages", () => {
    render(
      <MessageBubble
        characterName="Emma Clarke"
        message={{ id: "assistant-1", role: "assistant", content: "Good evening." }}
      />
    );

    const bubble = screen.getByTestId("assistant-audio-footer").parentElement;

    expect(bubble).toHaveClass("border-l-2");
    expect(bubble).toHaveClass("border-l-brand-accent");
    expect(screen.getByTestId("assistant-audio-footer")).toHaveClass("border-t");
  });

  it("uses a solid highlighted edge for user messages", () => {
    render(
      <MessageBubble
        characterName="Emma Clarke"
        message={{ id: "user-1", role: "user", content: "Hello." }}
      />
    );

    const bubble = screen.getByText("Hello.").closest(".rounded-bubble");

    expect(bubble).toHaveClass("before:w-1");
    expect(bubble).toHaveClass("before:bg-white/55");
  });

  it("collapses long assistant messages with a gradient and keeps audio controls visible", () => {
    render(
      <MessageBubble
        characterName="Jake Wilson"
        message={{
          id: "assistant-long",
          role: "assistant",
          content: "Long reply ".repeat(160)
        }}
        onSpeak={jest.fn()}
      />
    );

    expect(screen.getByTestId("assistant-message-content")).toHaveStyle({ maxHeight: "260px" });
    expect(screen.getByTestId("assistant-collapse-fade")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show more" })).toBeInTheDocument();
    expect(screen.getByTestId("assistant-audio-footer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(screen.getByTestId("assistant-message-content")).toHaveStyle({ maxHeight: "none" });
    expect(screen.queryByTestId("assistant-collapse-fade")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });

  it("does not collapse short assistant messages or user messages", () => {
    scrollHeightSpy.mockReturnValue(120);

    const { rerender } = render(
      <MessageBubble
        characterName="Emma Clarke"
        message={{ id: "assistant-short", role: "assistant", content: "Short reply." }}
      />
    );

    expect(screen.queryByRole("button", { name: /Show/ })).not.toBeInTheDocument();

    scrollHeightSpy.mockReturnValue(320);
    rerender(
      <MessageBubble
        characterName="Emma Clarke"
        message={{ id: "user-long", role: "user", content: "Long user message ".repeat(160) }}
      />
    );

    expect(screen.queryByRole("button", { name: /Show/ })).not.toBeInTheDocument();
  });
});
