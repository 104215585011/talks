"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

type ReportChartsStats = {
  achievements: Array<{ id: string; label: string; unlocked: boolean }>;
  characterInteractions: Array<{ characterId: string; characterName: string; count: number }>;
  conversationMinutes: Array<{ date: string; minutes: number }>;
  vocabularyBreakdown: Array<{ label: string; value: number }>;
};

const chartText = "#CBD5E1";

export function ReportCharts({ stats }: { stats: ReportChartsStats }) {
  return (
    <>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card title="Conversation time" subtitle="Minutes practised across the last seven days.">
          <Line
            data={{
              labels: stats.conversationMinutes.map((point) => point.date.slice(5)),
              datasets: [
                {
                  backgroundColor: "rgba(0, 229, 255, 0.16)",
                  borderColor: "#00E5FF",
                  data: stats.conversationMinutes.map((point) => point.minutes),
                  fill: true,
                  tension: 0.42
                }
              ]
            }}
            options={chartOptions}
          />
        </Card>
        <Card title="Vocabulary" subtitle="Words practised against the current weekly target.">
          <Doughnut
            data={{
              labels: stats.vocabularyBreakdown.map((item) => item.label),
              datasets: [
                {
                  backgroundColor: ["#00E5FF", "rgba(255,255,255,0.12)"],
                  borderWidth: 0,
                  data: stats.vocabularyBreakdown.map((item) => item.value)
                }
              ]
            }}
            options={chartOptions}
          />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card title="Character interactions" subtitle="How often each mentor appeared in sessions.">
          <Bar
            data={{
              labels: stats.characterInteractions.map((item) => item.characterName.split(" ")[0]),
              datasets: [
                {
                  backgroundColor: "#7C4DFF",
                  borderRadius: 8,
                  data: stats.characterInteractions.map((item) => item.count)
                }
              ]
            }}
            options={chartOptions}
          />
        </Card>
        <Card title="Achievements" subtitle="Milestones unlock as your practice history grows.">
          <div className="grid gap-3 md:grid-cols-2">
            {stats.achievements.map((achievement) => (
              <div
                className="rounded-lg border border-brand-accent/20 bg-brand-accent/[0.07] p-4"
                key={achievement.id}
              >
                <Trophy className="text-brand-accent" size={20} />
                <p className="mt-3 text-sm font-semibold text-white">{achievement.label}</p>
                <p className="mt-1 text-xs text-slate-400">Unlocked</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

const chartOptions = {
  animation: {
    duration: 700
  },
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: chartText
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: chartText
      }
    },
    y: {
      ticks: {
        color: chartText
      }
    }
  }
};
