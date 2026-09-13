"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashboardNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAutoOps } from "@/context/autoops-context";
import { Badge } from "@/components/ui/badge";

export function SidebarNav() {
  const pathname = usePathname();
  const { pendingItems } = useAutoOps();

  return (
    <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
      <p className="text-muted-foreground/70 px-3 pb-2 text-[11px] font-extrabold tracking-widest uppercase">
        Workspace
      </p>
      {dashboardNav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        const isQueue = item.href === "/dashboard/queue";

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
              active
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                : "text-muted-foreground hover:bg-violet-50 hover:text-violet-900"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon
                className={cn(
                  "size-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-white" : "text-violet-600/80 group-hover:text-violet-700"
                )}
              />
              <span>{item.label}</span>
            </div>

            {isQueue && pendingItems.length > 0 && (
              <Badge
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                  active
                    ? "bg-white text-violet-700"
                    : "bg-violet-100 text-violet-800 group-hover:bg-violet-200"
                )}
              >
                {pendingItems.length}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
