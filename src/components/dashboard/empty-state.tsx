import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "animate-fade-up relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-violet-200 bg-gradient-to-b from-violet-50/60 via-purple-50/30 to-white px-6 py-14 text-center",
        className
      )}
    >
      {/* Floating decorative blobs */}
      <div className="animate-blob pointer-events-none absolute top-10 left-[12%] size-16 rounded-full bg-violet-200/40 blur-xl" />
      <div
        className="animate-blob pointer-events-none absolute right-[15%] bottom-8 size-20 rounded-full bg-purple-200/40 blur-xl"
        style={{ animationDelay: "-8s" }}
      />

      <div className="relative">
        {/* Pulse ring behind icon */}
        <span className="animate-pulse-soft absolute inset-0 -m-3 rounded-3xl bg-violet-300/30" />
        <div className="animate-float relative grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-violet-500/30">
          <Icon className="size-7" strokeWidth={1.8} />
        </div>
      </div>

      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
        {description}
      </p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
