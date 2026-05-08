"use client";

import { useEffect, useState } from "react";
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
import { Award, Flame, MessageSquareText, Timer, Trophy } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { readAuthSession } from "@/lib/auth/client-session";

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

type UserStats = {
  achievements: Array<{ id: string; label: string; unlocked: boolean }>;
  characterInteractions: Array<{ characterId: string; characterName: string; count: number }>;
  conversationMinutes: Array<{ date: string; minutes: number }>;
  streakDays: number;
  totals: {
    conversationMinutes: number;
    messages: number;
    sessions: number;
    vocabulary: number;
  };
  vocabularyBreakdown: Array<{ label: string; value: number }>;
};

const chartText = "#CBD5E1";

export function LearningReport() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readAuthSession();

    if (!session) {
      setError("Sign in to view your learning report.");
      return;
    }

    fetch("/api/user/stats", {
      headers: {
        authorization: `Bearer ${session.accessToken}`
      }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Stats request failed");
        }

        setStats((await response.json()) as UserStats);
      })
      .catch(() => setError("Unable to load your report right now."));
  }, []);

  if (error) {
    return (
      <main className="min-h-screen px-6 py-10">
        <Card title="Learning report">
          <p className="text-sm text-slate-300">{error}</p>
        </Card>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="min-h-screen px-6 py-10">
        <Card title="Learning report">
          <p className="text-sm text-slate-300">Loading report...</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-brand-accent">
              Learning report
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold text-white md:text-6xl">
              Your practice signal.
            </h1>
          </div>
          <Badge tone="success">{stats.streakDays} day streak</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={<Timer size={18} />}
            label="Minutes"
            value={stats.totals.conversationMinutes}
          />
          <MetricCard
            icon={<MessageSquareText size={18} />}
            label="Messages"
            value={stats.totals.messages}
          />
          <MetricCard
            icon={<Award size={18} />}
            label="Vocabulary"
            value={stats.totals.vocabulary}
          />
          <MetricCard icon={<Flame size={18} />} label="Sessions" value={stats.totals.sessions} />
        </div>

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
          <Card
            title="Character interactions"
            subtitle="How often each mentor appeared in sessions."
          >
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
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-brand-accent">{icon}</span>
        <span className="font-display text-3xl font-semibold text-white">{value}</span>
      </div>
      <p className="mt-3 text-sm text-slate-400">{label}</p>
    </Card>
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
