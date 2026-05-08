import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type CardProps = HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  children: ReactNode;
  subtitle?: string;
  title?: string;
};

export function Card({ actions, children, className, subtitle, title, ...props }: CardProps) {
  return (
    <section className={cn("glass-panel rounded-lg p-5", className)} {...props}>
      {title || subtitle || actions ? (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h3 className="text-base font-semibold text-white">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
