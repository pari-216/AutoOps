"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, Shield, Sparkles, LayoutDashboard } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "How it works", href: "#how-it-works" },
  { name: "Security", href: "#security" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setIsAuthenticated(true);
        }
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-violet-100/80 bg-white/85 backdrop-blur-xl shadow-xs shadow-violet-500/5"
          : "border-b border-transparent bg-white/50 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo href="/" />

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
          {navLinks.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-muted-foreground hover:text-foreground hover:bg-violet-50/80 rounded-full px-4 py-1.5 text-sm font-medium transition-all"
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <Button
              asChild
              className="h-9.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="size-3.5" />
                Open Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-violet-50 h-9 rounded-xl px-3.5 text-xs font-medium"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                className="h-9.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Link href="/login">
                  Get Started
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {isAuthenticated ? (
            <Button
              asChild
              size="sm"
              className="rounded-xl bg-violet-600 text-xs font-semibold text-white shadow-sm"
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              className="rounded-xl bg-violet-600 text-xs font-semibold text-white shadow-sm"
            >
              <Link href="/login">Get Started</Link>
            </Button>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-xl border border-violet-200/80 bg-white p-2 transition-colors hover:bg-violet-50 focus-visible:ring-[3px] focus-visible:ring-violet-500/30"
          >
            {mobileMenuOpen ? <X className="size-5 text-violet-700" /> : <Menu className="size-5 text-violet-700" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="border-b border-violet-100 bg-white/95 px-4 py-4 backdrop-blur-xl md:hidden animate-fade-in">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-violet-50 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
              >
                {item.name}
              </a>
            ))}
            <div className="pt-2 border-t border-violet-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 text-white flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-md shadow-violet-500/20"
                >
                  <LayoutDashboard className="size-4" />
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="border-violet-200 text-violet-700 hover:bg-violet-50 flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 text-white flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-md shadow-violet-500/20"
                  >
                    Get Started
                    <ArrowRight className="size-4" />
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
