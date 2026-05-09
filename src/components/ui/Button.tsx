import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  isLoading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-white shadow-glow hover:scale-[1.02] hover:bg-[#247df1] hover:shadow-[0_8px_32px_rgba(26,115,232,0.4)] active:scale-[0.96] active:shadow-[inset_0_2px_12px_rgba(0,0,0,0.24)]",
  secondary:
    "border border-white/[0.15] bg-white/[0.08] text-slate-100 hover:scale-[1.01] hover:border-brand-accent/50 hover:bg-white/[0.12] hover:shadow-[0_8px_28px_rgba(0,229,255,0.12)] active:scale-[0.97]",
  ghost: "text-slate-200 hover:scale-[1.01] hover:bg-white/10 hover:text-white active:scale-[0.96]",
  danger:
    "bg-signal-danger text-white hover:scale-[1.02] hover:shadow-[0_8px_28px_rgba(255,107,122,0.34)] active:scale-[0.96]"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10 p-0"
};

export function Button({
  children,
  className,
  disabled,
  icon,
  isLoading = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition duration-200 focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-60",
        "ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {size === "icon" ? (
        isLoading ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          />
        ) : (
          (icon ?? children)
        )
      ) : (
        <>
          {isLoading ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
          ) : (
            icon
          )}
          {children}
        </>
      )}
    </button>
  );
}
