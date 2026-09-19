import Link from "next/link";
import { LifeBuoy, Sparkles } from "lucide-react";

import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserProfileMenu } from "@/components/dashboard/user-profile-menu";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center justify-between px-5 border-b border-violet-100/60">
        <Logo href="/dashboard" />
        <UserProfileMenu />
      </div>

      <SidebarNav />

      <div className="mt-auto space-y-3 p-4">
        <div className="relative overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-4">
          <div className="pointer-events-none absolute -top-6 -right-6 size-20 rounded-full bg-violet-200/50 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-violet-600" />
              <p className="text-sm font-bold text-foreground">
                AutoOps Live
              </p>
            </div>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Supabase Auth & RLS Guard Active.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
        >
          <LifeBuoy className="size-4" />
          Back to site
        </Link>
      </div>
    </aside>
  );
}
