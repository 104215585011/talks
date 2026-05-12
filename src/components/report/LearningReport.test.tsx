/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { LearningReport } from "./LearningReport";

jest.mock("react-chartjs-2", () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />,
  Line: () => <div data-testid="line-chart" />
}));

jest.mock("@/lib/auth/client-session", () => ({
  readAuthSession: () => ({ accessToken: "test-access-token", email: "learner@example.com" })
}));

const statsResponse = {
  achievements: [
    { id: "first-session", label: "First session", unlocked: true },
    { id: "streak", label: "Three-day streak", unlocked: true }
  ],
  characterInteractions: [
    { characterId: "emma", characterName: "Emma Clarke", count: 4 },
    { characterId: "jake", characterName: "Jake Wilson", count: 2 }
  ],
  conversationMinutes: [
    { date: "2026-05-06", minutes: 12 },
    { date: "2026-05-07", minutes: 18 }
  ],
  streakDays: 3,
  totals: {
    conversationMinutes: 42,
    messages: 128,
    sessions: 9,
    vocabulary: 37
  },
  vocabularyBreakdown: [
    { label: "Practised", value: 37 },
    { label: "Remaining", value: 63 }
  ]
};

describe("LearningReport", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => statsResponse,
      ok: true
    }) as jest.Mock;
  });

  it("renders upgraded glass metrics with animated values and a low-intensity fluid background", async () => {
    render(<LearningReport />);

    await waitFor(() => {
      expect(screen.getByText("Minutes")).toBeInTheDocument();
    });

    expect(screen.getByTestId("fluid-background")).toBeInTheDocument();
    expect(screen.getByTestId("fluid-orb-blue")).toHaveStyle({ opacity: "0.25" });

    const metricCards = screen.getAllByTestId("report-metric-card");
    expect(metricCards).toHaveLength(4);
    expect(metricCards[0]).toHaveClass("bg-[rgba(15,16,28,0.75)]");
    expect(metricCards[0]).toHaveClass("backdrop-blur-[20px]");
    expect(metricCards[0]).toHaveClass("border-t-brand-accent");
    expect(metricCards[1]).toHaveClass("border-t-brand-primary");
    expect(metricCards[2]).toHaveClass("border-t-brand-purple");
    expect(metricCards[3]).toHaveClass("border-t-[#FFC83D]");

    expect(screen.getByTestId("metric-value-Minutes")).toHaveAttribute("data-animated", "true");
    expect(screen.getByTestId("metric-value-Messages")).toHaveAttribute("data-animated", "true");
  });
});
