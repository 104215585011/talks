/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { Input } from "./Input";

describe("design system primitives", () => {
  it("renders button variants with stable disabled affordance", () => {
    render(
      <Button disabled variant="secondary">
        Continue
      </Button>
    );

    const button = screen.getByRole("button", { name: "Continue" });

    expect(button).toBeDisabled();
    expect(button).toHaveClass("border-white/[0.15]");
    expect(button).toHaveClass("disabled:cursor-not-allowed");
    expect(button).not.toHaveClass("hover:scale-[1.01]");
    expect(button).not.toHaveClass("active:scale-[0.97]");
  });

  it("adds dimensional hover and press affordance to primary buttons", () => {
    render(<Button>Ship it</Button>);

    const button = screen.getByRole("button", { name: "Ship it" });

    expect(button).toHaveClass("hover:scale-[1.04]");
    expect(button).toHaveClass("hover:shadow-[0_8px_32px_rgba(26,115,232,0.4)]");
    expect(button).toHaveClass("active:scale-[0.96]");
  });

  it("renders icon-only buttons with stronger hover and tap feedback", () => {
    render(
      <Button aria-label="Open menu" icon={<span data-testid="menu-icon" />} size="icon">
        Open menu
      </Button>
    );

    const button = screen.getByRole("button", { name: "Open menu" });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("hover:scale-[1.08]");
    expect(button).toHaveClass("active:scale-[0.92]");
    expect(screen.getAllByTestId("menu-icon")).toHaveLength(1);
  });

  it("associates input labels, helper text, and error text", () => {
    render(
      <Input
        error="Email is required"
        helperText="Use the address you registered with"
        label="Email"
        name="email"
      />
    );

    const input = screen.getByLabelText("Email");

    expect(input).toHaveAccessibleDescription(
      "Use the address you registered with Email is required"
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Email is required")).toHaveClass("text-red-200");
  });

  it("renders badges with tone-specific styles", () => {
    render(<Badge tone="cyan">Streaming</Badge>);

    expect(screen.getByText("Streaming")).toHaveClass("text-cyan-100");
  });

  it("uses avatar image when supplied and deterministic initials otherwise", () => {
    const { rerender } = render(<Avatar name="Emma Clarke" src="/emma.png" />);

    expect(screen.getByRole("img", { name: "Emma Clarke" })).toHaveAttribute("src", "/emma.png");

    rerender(<Avatar name="Jake Wilson" />);

    expect(screen.getByText("JW")).toBeInTheDocument();
  });

  it("composes card structure with title and glass styling", () => {
    render(
      <Card title="Design Tokens" subtitle="Core surfaces">
        <p>Palette</p>
      </Card>
    );

    expect(screen.getByRole("heading", { name: "Design Tokens" })).toBeInTheDocument();
    expect(screen.getByText("Core surfaces")).toBeInTheDocument();
    expect(screen.getByText("Palette").closest("section")).toHaveClass("glass-panel");
  });
});
