"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, ShieldCheck, ChevronDown } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function UserProfileMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    // Get current user session
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  };

  const email = user?.email || "admin@autoops.dev";
  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    email.split("@")[0];
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = fullName.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl border border-violet-100 bg-white/90 p-1.5 pr-3 shadow-xs hover:border-violet-200 hover:bg-violet-50/50 transition-all"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={fullName}
            className="size-7 rounded-lg object-cover ring-1 ring-violet-200"
          />
        ) : (
          <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 text-white font-bold text-xs shadow-xs">
            {initials}
          </div>
        )}
        <div className="hidden sm:block text-left text-xs">
          <p className="font-bold text-foreground max-w-[120px] truncate leading-tight">
            {fullName}
          </p>
          <p className="text-[10px] text-muted-foreground max-w-[120px] truncate leading-tight">
            {email}
          </p>
        </div>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="animate-fade-in absolute right-0 mt-2 z-50 w-56 rounded-2xl border border-violet-100 bg-white p-2 shadow-xl shadow-violet-500/10 space-y-1">
            <div className="p-2 border-b border-violet-100/70">
              <p className="text-xs font-bold text-foreground truncate">{fullName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{email}</p>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit">
                <ShieldCheck className="size-3" /> Authenticated
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
