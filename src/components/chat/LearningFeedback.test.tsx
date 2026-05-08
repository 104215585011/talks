/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { LearningFeedback } from "./LearningFeedback";

describe("LearningFeedback", () => {
  it("renders corrections and new vocabulary from the final SSE payload", () => {
    render(
      <LearningFeedback
        feedback={{
          corrections: ["Say: I went to school yesterday."],
          newWords: ["polished", "natural"]
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "Learning notes" })).toBeInTheDocument();
    expect(screen.getByText("Say: I went to school yesterday.")).toBeInTheDocument();
    expect(screen.getByText("polished")).toBeInTheDocument();
    expect(screen.getByText("natural")).toBeInTheDocument();
  });

  it("renders nothing when both arrays are empty", () => {
    const { container } = render(<LearningFeedback feedback={{ corrections: [], newWords: [] }} />);

    expect(container).toBeEmptyDOMElement();
  });
});
