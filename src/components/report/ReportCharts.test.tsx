/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ReportCharts } from "./ReportCharts";

jest.mock("react-chartjs-2", () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />,
  Line: () => <div data-testid="line-chart" />
}));

const stats = {
  achievements: [{ id: "first-session", label: "First session", unlocked: true }],
  characterInteractions: [{ characterId: "emma", characterName: "Emma Clarke", count: 4 }],
  conversationMinutes: [{ date: "2026-05-06", minutes: 12 }],
  vocabularyBreakdown: [
    { label: "Practised", value: 37 },
    { label: "Remaining", value: 63 }
  ]
};

describe("ReportCharts", () => {
  it("renders the chart-heavy report sections in an isolated client chunk", () => {
    render(<ReportCharts stats={stats} />);

    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByTestId("doughnut-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByText("First session")).toBeInTheDocument();
  });
});
