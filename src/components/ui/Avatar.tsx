import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type AvatarSize = "sm" | "md" | "lg";

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  isActive?: boolean;
  name: string;
  size?: AvatarSize;
  src?: string;
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg"
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({
  className,
  isActive = false,
  name,
  size = "md",
  src,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.18] bg-gradient-to-br from-brand-primary/30 to-brand-purple/30 font-display font-semibold text-white",
        sizeClasses[size],
        isActive && "animate-pulse-aura",
        className
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className="h-full w-full object-cover" src={src} />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
