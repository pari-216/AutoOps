import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  /** Entrance animation delay in ms. */
  delay?: number;
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
  delay = 0,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "animate-fade-up group relative overflow-hidden rounded-2xl border border-violet-100/90 bg-white/90 p-5 shadow-sm shadow-violet-500/5 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-300 hover:bg-white hover:shadow-xl hover:shadow-violet-500/15",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full bg-gradient-to-br from-violet-200/50 to-purple-200/50 opacity-60 blur-2xl transition-transform duration-500 group-hover:scale-150 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
              {value}
            </p>
            {trend && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                {trend}
              </span>
            )}
          </div>
          {hint && (
            <p className="text-muted-foreground/80 text-xs font-medium">{hint}</p>
          )}
        </div>
        <div className="bg-violet-50 group-hover:bg-gradient-to-br group-hover:from-violet-600 group-hover:to-purple-600 group-hover:text-white grid size-11 shrink-0 place-items-center rounded-xl text-violet-600 shadow-xs transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
          <Icon className="size-5.5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
