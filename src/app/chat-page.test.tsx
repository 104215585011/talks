/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ChatPage from "./chat/page";

jest.mock("@/components/navigation/AppNav", () => ({
  AppNav: () => <nav aria-label="app nav" />
}));

jest.mock("@/components/chat/ChatWorkspace", () => ({
  ChatWorkspace: () => <div data-testid="chat-workspace" />
}));

describe("ChatPage", () => {
  it("uses the reusable fluid background behind the chat workspace", () => {
    render(<ChatPage />);

    expect(screen.getByTestId("fluid-background")).toBeInTheDocument();
    expect(screen.getByTestId("fluid-orb-blue")).toBeInTheDocument();
    expect(screen.getByTestId("fluid-orb-purple")).toBeInTheDocument();
    expect(screen.getByTestId("chat-workspace")).toBeInTheDocument();
  });
});
