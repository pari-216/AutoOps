"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/logo";
import { dashboardNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAutoOps } from "@/context/autoops-context";
import { Badge } from "@/components/ui/badge";
import { UserProfileMenu } from "@/components/dashboard/user-profile-menu";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { pendingItems } = useAutoOps();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-violet-100 bg-white/80 px-4 backdrop-blur-md lg:hidden">
      <Logo href="/dashboard" />

      <div className="flex items-center gap-2">
        <UserProfileMenu />
        <Button
          variant="ghost"
          size="icon"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl hover:bg-violet-50 text-violet-700"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {open && (
        <>
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="animate-fade-in fixed inset-0 top-16 z-40 bg-foreground/20 backdrop-blur-xs"
          />
          <nav className="animate-slide-in-left fixed inset-x-0 top-16 z-50 space-y-1.5 border-b border-violet-100 bg-white p-4 shadow-xl shadow-violet-500/10">
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
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-violet-600 text-white"
                      : "text-muted-foreground hover:bg-violet-50 hover:text-violet-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="size-4.5" />
                    <span>{item.label}</span>
                  </div>

                  {isQueue && pendingItems.length > 0 && (
                    <Badge
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        active
                          ? "bg-white text-violet-700"
                          : "bg-violet-100 text-violet-800"
                      )}
                    >
                      {pendingItems.length}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </header>
  );
}
