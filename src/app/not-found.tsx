"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Search, Home } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col justify-between bg-background overflow-hidden">
      {/* Ambient background decoration */}
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[460px] -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-[10%] size-80 rounded-full bg-purple-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-[10%] size-72 rounded-full bg-indigo-200/30 blur-3xl" />

      {/* Top navigation header */}
      <header className="relative z-10 w-full border-b border-violet-100/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo href="/" />
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-violet-50 focus-visible:ring-violet-500/30 focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <Home className="size-4 text-violet-600" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Main 404 Hero Content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg text-center animate-fade-up">
          {/* Card container */}
          <div className="relative overflow-hidden rounded-3xl border border-violet-100/90 bg-white/90 p-8 shadow-xl shadow-violet-500/10 backdrop-blur-xl sm:p-10">
            {/* Subtle glow ring inside card */}
            <div className="pointer-events-none absolute -top-24 left-1/2 size-48 -translate-x-1/2 rounded-full bg-violet-100/60 blur-2xl" />

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/80 px-3.5 py-1 text-xs font-semibold text-violet-700 shadow-xs mb-6">
              <Search className="size-3.5 text-violet-600" aria-hidden="true" />
              <span>Page not found</span>
            </div>

            {/* Large 404 Number */}
            <div className="text-6xl sm:text-7xl font-black tracking-tight text-gradient mb-3 select-none">
              404
            </div>

            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Oops! This page doesn&apos;t exist.
            </h1>

            {/* Description */}
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
              The page you&apos;re looking for may have moved, or the link might be incorrect.
            </p>

            {/* Action buttons */}
            <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoBack}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border-violet-200 bg-white font-medium hover:bg-violet-50 text-foreground transition-all active:scale-95 focus-visible:ring-violet-500/30"
              >
                <ArrowLeft className="size-4 text-violet-600" />
                Go Back
              </Button>

              <Button
                asChild
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-semibold shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.01] active:scale-95 text-white focus-visible:ring-violet-500/30"
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4 text-white" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-muted-foreground">
        AutoOps · AI Agent Orchestrator for Operations
      </footer>
    </div>
  );
}
