/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import CharactersPage from "./characters/page";

jest.mock("@/components/navigation/AppNav", () => ({
  AppNav: () => <nav aria-label="app nav" />
}));

jest.mock("@/components/characters/CharacterSelection", () => ({
  CharacterSelection: () => <div data-testid="character-selection" />
}));

describe("CharactersPage", () => {
  it("uses the reusable fluid background instead of the starfield", () => {
    render(<CharactersPage />);

    expect(screen.getByTestId("fluid-background")).toBeInTheDocument();
    expect(screen.getByTestId("fluid-orb-blue")).toBeInTheDocument();
    expect(screen.getByTestId("fluid-orb-purple")).toBeInTheDocument();
    expect(screen.getByTestId("fluid-orb-cyan")).toBeInTheDocument();
  });
});
