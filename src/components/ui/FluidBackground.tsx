import { cn } from "@/lib/utils/cn";

type FluidOrbColor = "blue" | "purple" | "cyan" | "warning" | "success";

type FluidOrb = {
  color: FluidOrbColor;
  intensity?: number;
};

type FluidBackgroundProps = {
  className?: string;
  noise?: boolean;
  orbs?: FluidOrb[];
  vignette?: boolean;
};

const defaultOrbs: FluidOrb[] = [
  { color: "blue", intensity: 0.65 },
  { color: "purple", intensity: 0.55 },
  { color: "cyan", intensity: 0.4 }
];

const orbStyles: Record<
  FluidOrbColor,
  {
    animationClass: string;
    background: string;
    className: string;
  }
> = {
  blue: {
    animationClass: "animate-fluid-blue",
    background:
      "radial-gradient(circle at 40% 40%, oklch(0.60 0.18 256) 0%, oklch(0.45 0.18 260) 40%, oklch(0.28 0.12 262 / 0) 72%)",
    className: "h-[65vmin] w-[65vmin] blur-[130px]"
  },
  purple: {
    animationClass: "animate-fluid-purple",
    background:
      "radial-gradient(circle, oklch(0.55 0.22 300) 0%, oklch(0.40 0.20 308) 42%, oklch(0.26 0.14 312 / 0) 72%)",
    className: "h-[58vmin] w-[58vmin] blur-[130px]"
  },
  cyan: {
    animationClass: "animate-fluid-cyan",
    background:
      "radial-gradient(circle, oklch(0.72 0.18 195) 0%, oklch(0.52 0.18 200) 45%, oklch(0.30 0.12 205 / 0) 72%)",
    className: "h-[38vmin] w-[38vmin] blur-[100px]"
  },
  warning: {
    animationClass: "animate-fluid-purple",
    background:
      "radial-gradient(circle, oklch(0.78 0.18 75) 0%, oklch(0.60 0.16 70) 42%, oklch(0.34 0.12 68 / 0) 72%)",
    className: "h-[44vmin] w-[44vmin] blur-[120px]"
  },
  success: {
    animationClass: "animate-fluid-cyan",
    background:
      "radial-gradient(circle, oklch(0.75 0.18 155) 0%, oklch(0.54 0.16 155) 42%, oklch(0.32 0.12 155 / 0) 72%)",
    className: "h-[44vmin] w-[44vmin] blur-[120px]"
  }
};

export function FluidBackground({
  className,
  noise = true,
  orbs = defaultOrbs,
  vignette = true
}: FluidBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 overflow-hidden bg-[radial-gradient(rgb(14,15,26)_0%,rgb(8,9,16)_65%,rgb(5,5,11)_100%)]",
        className
      )}
      data-testid="fluid-background"
    >
      {orbs.map((orb, index) => {
        const style = orbStyles[orb.color];

        return (
          <div
            className={cn(
              "absolute left-1/2 top-1/2 rounded-full mix-blend-screen saturate-[1.18] will-change-transform",
              style.animationClass,
              style.className
            )}
            data-testid={`fluid-orb-${orb.color}`}
            key={`${orb.color}-${index}`}
            style={{
              background: style.background,
              opacity: orb.intensity ?? 0.65,
              transform: "translate(-50%, -50%)"
            }}
          />
        );
      })}
      {noise ? <div className="fluid-noise" data-testid="fluid-noise" /> : null}
      {vignette ? <div className="fluid-vignette" data-testid="fluid-vignette" /> : null}
    </div>
  );
}
