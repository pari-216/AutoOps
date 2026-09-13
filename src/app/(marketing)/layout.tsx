import Link from "next/link";

import { Logo } from "@/components/logo";

const navLinks = ["Features", "How it works", "Security"];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-violet-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-muted-foreground hover:text-foreground rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-violet-50"
              >
                {item}
              </a>
            ))}
          </nav>
          <Link
            href="/login"
            className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800 inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Ambient hero background */}
      <div className="relative flex-1">
        <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[600px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-40 right-[10%] size-72 rounded-full bg-purple-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-72 left-[8%] size-72 rounded-full bg-indigo-200/30 blur-3xl" />
        {children}
      </div>
    </div>
  );
}
