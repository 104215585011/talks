import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeTone = "blue" | "cyan" | "purple" | "success" | "warning" | "neutral";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  blue: "border-brand-primary/40 bg-brand-primary/15 text-blue-100",
  cyan: "border-brand-accent/40 bg-brand-accent/12 text-cyan-100",
  purple: "border-brand-purple/40 bg-brand-purple/15 text-violet-100",
  success: "border-signal-success/40 bg-signal-success/12 text-emerald-100",
  warning: "border-signal-warning/40 bg-signal-warning/12 text-amber-100",
  neutral: "border-white/[0.14] bg-white/[0.08] text-slate-200"
};

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
