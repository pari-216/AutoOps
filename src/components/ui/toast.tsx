"use client";

import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { useAutoOps } from "@/context/autoops-context";

export function ToastContainer() {
  const { toasts, removeToast } = useAutoOps();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-toast-slide pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border border-violet-100 bg-white/95 shadow-xl shadow-violet-500/15 backdrop-blur-md transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            {toast.type === "success" && (
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="size-4.5" />
              </div>
            )}
            {toast.type === "info" && (
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 border border-violet-200">
                <Info className="size-4.5" />
              </div>
            )}
            {toast.type === "error" && (
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="size-4.5" />
              </div>
            )}
            <p className="text-sm font-medium text-foreground leading-snug">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted-foreground/60 hover:text-foreground p-1 rounded-md transition-colors"
            aria-label="Close notification"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
