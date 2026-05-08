/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import LoginPage from "./login/page";
import RegisterPage from "./register/page";

const starfieldMock = jest.fn(({ density }: { density?: number }) => (
  <div data-density={density} data-testid="auth-starfield" />
));

jest.mock("@/components/effects/LazyStarfield", () => ({
  LazyStarfield: (props: { density?: number }) => starfieldMock(props)
}));

jest.mock("@/components/auth/AuthForm", () => ({
  AuthForm: ({ mode }: { mode: string }) => <form aria-label={`${mode} form`} />
}));

describe("auth pages", () => {
  beforeEach(() => {
    starfieldMock.mockClear();
  });

  it("renders the login page with a lightweight starfield", () => {
    render(<LoginPage />);

    expect(screen.getByTestId("auth-starfield")).toHaveAttribute("data-density", "400");
    expect(screen.getByRole("form", { name: "login form" })).toBeInTheDocument();
  });

  it("renders the register page with a lightweight starfield", () => {
    render(<RegisterPage />);

    expect(screen.getByTestId("auth-starfield")).toHaveAttribute("data-density", "400");
    expect(screen.getByRole("form", { name: "register form" })).toBeInTheDocument();
  });
});
