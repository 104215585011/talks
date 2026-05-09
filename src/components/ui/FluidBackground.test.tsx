/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { FluidBackground } from "./FluidBackground";

describe("FluidBackground", () => {
  it("renders configured fluid orbs with noise and vignette layers", () => {
    render(
      <FluidBackground
        orbs={[
          { color: "blue", intensity: 0.65 },
          { color: "purple", intensity: 0.55 },
          { color: "cyan", intensity: 0.4 }
        ]}
      />
    );

    expect(screen.getByTestId("fluid-background")).toBeInTheDocument();
    expect(screen.getByTestId("fluid-background")).toHaveClass("fixed");
    expect(screen.getByTestId("fluid-orb-blue")).toHaveStyle({ opacity: "0.65" });
    expect(screen.getByTestId("fluid-orb-purple")).toHaveStyle({ opacity: "0.55" });
    expect(screen.getByTestId("fluid-orb-cyan")).toHaveStyle({ opacity: "0.4" });
    expect(screen.getByTestId("fluid-noise")).toBeInTheDocument();
    expect(screen.getByTestId("fluid-vignette")).toBeInTheDocument();
  });

  it("can hide optional visual layers", () => {
    render(<FluidBackground noise={false} vignette={false} />);

    expect(screen.queryByTestId("fluid-noise")).not.toBeInTheDocument();
    expect(screen.queryByTestId("fluid-vignette")).not.toBeInTheDocument();
  });
});
