"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { LEGAL_CONFIG } from "@/lib/legal";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    searchParams.get("error") === "auth_failed"
      ? "Authentication failed. Please try logging in again."
      : null
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);

    // Enforce Terms & Privacy agreement for new signups
    if (mode === "signup" && !agreedToTerms) {
      setErrorMsg("Please agree to the Terms of Service and acknowledge the Privacy Policy to create an account.");
      return;
    }

    setGoogleLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        router.push(redirectPath);
        return;
      }

      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
          queryParams: mode === "signup" ? {
            access_type: "offline",
            prompt: "consent",
          } : undefined,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setGoogleLoading(false);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect to authentication server.");
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === "signup" && !agreedToTerms) {
      setErrorMsg("Please agree to the Terms of Service and acknowledge the Privacy Policy to create an account.");
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        router.push(redirectPath);
        return;
      }

      const supabase = createClient();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
        } else {
          router.push(redirectPath);
          router.refresh();
        }
      } else {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const now = new Date().toISOString();

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
              redirectPath
            )}`,
            data: {
              terms_accepted_at: now,
              terms_version: LEGAL_CONFIG.currentTermsVersion,
              privacy_acknowledged_at: now,
              privacy_version: LEGAL_CONFIG.currentPrivacyVersion,
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
        } else if (data.session) {
          // Record consent via API in background
          fetch("/api/auth/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              termsVersion: LEGAL_CONFIG.currentTermsVersion,
              privacyVersion: LEGAL_CONFIG.currentPrivacyVersion,
            }),
          }).catch(() => {});

          router.push(redirectPath);
          router.refresh();
        } else {
          setSuccessMsg(
            "Account created! Please check your email to confirm your subscription."
          );
          setLoading(false);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo href="/" iconOnly className="scale-110" />
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
          {mode === "signin" ? "Welcome back to AutoOps" : "Create AutoOps Account"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {mode === "signin"
            ? "Sign in to review and approve your AI agent's operational work."
            : "Sign up to start automating operational emails with human approval."}
        </p>
      </div>

      <Card className="border-violet-100/90 bg-white/90 shadow-xl shadow-violet-500/10 backdrop-blur-xl rounded-3xl">
        <CardContent className="space-y-5 pt-6">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium animate-fade-in">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 font-medium animate-fade-in">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google sign-in */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading || (mode === "signup" && !agreedToTerms)}
            variant="outline"
            className={`h-11 w-full rounded-xl border-violet-200 bg-white font-medium hover:bg-violet-50 transition-all text-foreground ${
              mode === "signup" && !agreedToTerms ? "opacity-60 cursor-not-allowed" : "active:scale-95"
            }`}
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin text-violet-600" />
            ) : (
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {mode === "signin" ? "Continue with Google" : "Sign up with Google"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-violet-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white text-muted-foreground/70 px-3 text-xs font-semibold tracking-wider uppercase">
                or
              </span>
            </div>
          </div>

          {/* Email sign-in / sign-up form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs leading-none font-bold uppercase tracking-wider text-muted-foreground"
              >
                Work Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="border-violet-200 placeholder:text-muted-foreground/60 flex h-10.5 w-full rounded-xl border bg-white px-3.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-violet-500 focus-visible:ring-violet-500/30 focus-visible:ring-[3px]"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs leading-none font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() =>
                      setErrorMsg("Password reset email feature enabled in settings.")
                    }
                    className="text-violet-600 hover:text-violet-700 text-xs font-semibold transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-violet-200 placeholder:text-muted-foreground/60 flex h-10.5 w-full rounded-xl border bg-white px-3.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-violet-500 focus-visible:ring-violet-500/30 focus-visible:ring-[3px]"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {/* Signup terms & privacy consent checkbox */}
            {mode === "signup" && (
              <div className="flex items-start gap-2.5 pt-1 animate-fade-in">
                <input
                  id="terms-checkbox"
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="size-4 shrink-0 rounded border-violet-300 text-violet-600 focus:ring-violet-500/30 focus:ring-2 mt-0.5 cursor-pointer accent-violet-600"
                />
                <label
                  htmlFor="terms-checkbox"
                  className="text-xs text-muted-foreground leading-snug cursor-pointer select-none"
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:text-violet-700 font-semibold underline underline-offset-2"
                  >
                    Terms of Service
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:text-violet-700 font-semibold underline underline-offset-2"
                  >
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || googleLoading || (mode === "signup" && !agreedToTerms)}
              className={`h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-bold shadow-lg shadow-violet-500/25 transition-all text-white ${
                mode === "signup" && !agreedToTerms ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.01] active:scale-95"
              }`}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin text-white" />
              ) : mode === "signin" ? (
                "Sign in to Dashboard"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="text-center pt-2">
            {mode === "signin" ? (
              <p className="text-xs text-muted-foreground">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-violet-600 hover:text-violet-700 font-bold transition-colors"
                >
                  Sign up now
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-violet-600 hover:text-violet-700 font-bold transition-colors"
                >
                  Sign in instead
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute right-[12%] bottom-0 size-72 rounded-full bg-purple-200/30 blur-3xl" />

      {/* Back to site */}
      <div className="relative z-10 p-4 sm:p-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-violet-50"
        >
          <ArrowLeft className="size-4 text-violet-600" />
          Back to site
        </Link>
      </div>

      {/* Sign-in card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-24">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8 text-violet-600">
              <Loader2 className="size-8 animate-spin" />
            </div>
          }
        >
          <LoginFormContent />
        </Suspense>
      </main>
    </div>
  );
}
