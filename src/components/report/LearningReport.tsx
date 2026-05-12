"use client";

import { useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform
} from "framer-motion";
import dynamic from "next/dynamic";
import { Award, Flame, MessageSquareText, Timer } from "lucide-react";
import { Badge, Card, FluidBackground } from "@/components/ui";
import { readAuthSession } from "@/lib/auth/client-session";
import { cn } from "@/lib/utils/cn";

const ReportCharts = dynamic(() => import("./ReportCharts").then((module) => module.ReportCharts), {
  loading: () => <ReportChartsLoading />,
  ssr: false
});

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

const metricAccentClass = {
  blue: "border-t-brand-primary text-brand-primary shadow-[0_16px_40px_-12px_rgba(26,115,232,0.32)]",
  cyan: "border-t-brand-accent text-brand-accent shadow-[0_16px_40px_-12px_rgba(0,229,255,0.26)]",
  purple: "border-t-brand-purple text-brand-purple shadow-[0_16px_40px_-12px_rgba(124,77,255,0.32)]",
  warning: "border-t-[#FFC83D] text-[#FFC83D] shadow-[0_16px_40px_-12px_rgba(255,200,61,0.24)]"
} as const;

type MetricAccent = keyof typeof metricAccentClass;

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
      <main className="relative min-h-screen overflow-hidden px-6 py-10">
        <ReportBackground />
        <Card className="relative z-10 mx-auto max-w-xl" title="Learning report">
          <p className="text-sm text-slate-300">{error}</p>
        </Card>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="relative min-h-screen overflow-hidden px-6 py-10">
        <ReportBackground />
        <Card className="relative z-10 mx-auto max-w-xl" title="Learning report">
          <p className="text-sm text-slate-300">Loading report...</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10">
      <ReportBackground />
      <section className="relative z-10 mx-auto max-w-7xl">
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
            accent="cyan"
            icon={<Timer size={18} />}
            label="Minutes"
            value={stats.totals.conversationMinutes}
          />
          <MetricCard
            accent="blue"
            icon={<MessageSquareText size={18} />}
            label="Messages"
            value={stats.totals.messages}
          />
          <MetricCard
            accent="purple"
            icon={<Award size={18} />}
            label="Vocabulary"
            value={stats.totals.vocabulary}
          />
          <MetricCard
            accent="warning"
            icon={<Flame size={18} />}
            label="Sessions"
            value={stats.totals.sessions}
          />
        </div>

        <ReportCharts stats={stats} />
      </section>
    </main>
  );
}

function ReportBackground() {
  return (
    <FluidBackground
      className="opacity-80"
      orbs={[
        { color: "blue", intensity: 0.25 },
        { color: "purple", intensity: 0.18 },
        { color: "cyan", intensity: 0.12 }
      ]}
    />
  );
}

function ReportChartsLoading() {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2" data-testid="report-charts-loading">
      <Card title="Conversation time">
        <div className="h-48 animate-pulse rounded-lg bg-white/[0.06]" />
      </Card>
      <Card title="Vocabulary">
        <div className="h-48 animate-pulse rounded-lg bg-white/[0.06]" />
      </Card>
    </div>
  );
}

function MetricCard({
  accent,
  icon,
  label,
  value
}: {
  accent: MetricAccent;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <motion.section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[rgba(15,16,28,0.75)] p-5 backdrop-blur-[20px]",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/10",
        metricAccentClass[accent]
      )}
      data-testid="report-metric-card"
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center justify-between">
        <span className={metricAccentClass[accent]}>{icon}</span>
        <AnimatedMetricValue label={label} value={value} />
      </div>
      <p className="mt-3 text-sm text-slate-400">{label}</p>
    </motion.section>
  );
}

function AnimatedMetricValue({ label, value }: { label: string; value: number }) {
  const metricValue = useMotionValue(0);
  const roundedValue = useTransform(metricValue, (latest) =>
    Math.round(latest).toLocaleString()
  );

  useEffect(() => {
    const controls = animate(metricValue, value, {
      duration: 0.8,
      ease: "easeOut"
    });

    return () => controls.stop();
  }, [metricValue, value]);

  return (
    <motion.span
      className="font-display text-3xl font-semibold text-white"
      data-animated="true"
      data-testid={`metric-value-${label}`}
    >
      {roundedValue}
    </motion.span>
  );
}
