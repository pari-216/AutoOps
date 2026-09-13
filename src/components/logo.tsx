import Link from "next/link";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  href?: string | null;
  /** Invert text color, e.g. for use on dark or primary backgrounds. */
  light?: boolean;
}

/**
 * AutoOps brand mark: a rounded violet tile containing a stylized
 * "circuit + check" glyph, next to the wordmark and optional tagline.
 */
export function Logo({
  className,
  iconOnly = false,
  href = "/",
  light = false,
}: LogoProps) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 shadow-lg shadow-violet-500/25">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-5 text-white"
          aria-hidden="true"
        >
          <path
            d="M4 12.5l4.5 4.5L20 6.5"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12.5 3.5h6.5a1.5 1.5 0 011.5 1.5v6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="4" cy="12.5" r="1.4" fill="currentColor" opacity="0.9" />
          <circle cx="20.5" cy="12.5" r="1.4" fill="currentColor" opacity="0.5" />
        </svg>
        <span className="absolute inset-0 rounded-xl ring-1 ring-white/30 ring-inset" />
      </span>
      {!iconOnly && (
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            light ? "text-white" : "text-foreground"
          )}
        >
          AutoOps
        </span>
      )}
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="focus-visible:ring-ring/50 rounded-lg focus-visible:ring-[3px] focus-visible:outline-none">
      {inner}
    </Link>
  );
}
