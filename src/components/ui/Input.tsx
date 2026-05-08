import { forwardRef, type InputHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  helperText?: string;
  label: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, helperText, id, label, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [helperText ? helperId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label className="block text-sm font-medium text-slate-100" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? "true" : "false"}
        className={cn(
          "mt-2 h-12 w-full rounded-control border bg-white/[0.08] px-4 text-sm text-white placeholder:text-slate-500 transition duration-200",
          "border-white/[0.15] hover:border-white/[0.24] focus:focus-ring focus:ring-1 focus:ring-brand-accent",
          error &&
            "border-signal-danger/70 focus:shadow-[0_0_0_1px_rgba(255,107,122,0.7),0_0_0_6px_rgba(255,107,122,0.13)]",
          className
        )}
        id={inputId}
        ref={ref}
        {...props}
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-slate-400" id={helperId}>
          {helperText}
        </span>
      ) : null}
      {error ? (
        <span className="mt-2 block text-xs leading-5 text-red-200" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
});
