import type { ReactNode } from "react";

import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Sidebar } from "@/components/dashboard/sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="bg-gradient-to-b from-violet-50/50 via-background to-background min-h-dvh flex-1 lg:min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
