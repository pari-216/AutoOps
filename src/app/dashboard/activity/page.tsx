import Link from "next/link";
import { Activity, CheckCircle2, Mail, Zap, XCircle, Pencil } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

interface ActivityLogRecord {
  id: string;
  action_type: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

// Map action_type → visual properties
function getActionMeta(actionType: string): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  Icon: React.ElementType;
} {
  switch (actionType) {
    case "email_received":
      return {
        label: "Email Received",
        bgClass: "bg-violet-50",
        textClass: "text-violet-700",
        borderClass: "border-violet-200",
        Icon: Mail,
      };
    case "action_approved":
      return {
        label: "Action Approved",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        borderClass: "border-emerald-200",
        Icon: CheckCircle2,
      };
    case "action_edited":
      return {
        label: "Action Edited & Approved",
        bgClass: "bg-purple-50",
        textClass: "text-purple-700",
        borderClass: "border-purple-200",
        Icon: Pencil,
      };
    case "action_rejected":
      return {
        label: "Action Rejected",
        bgClass: "bg-rose-50",
        textClass: "text-rose-700",
        borderClass: "border-rose-200",
        Icon: XCircle,
      };
    case "automation_triggered":
      return {
        label: "Automation Triggered",
        bgClass: "bg-amber-50",
        textClass: "text-amber-700",
        borderClass: "border-amber-200",
        Icon: Zap,
      };
    default:
      return {
        label: actionType,
        bgClass: "bg-slate-50",
        textClass: "text-slate-700",
        borderClass: "border-slate-200",
        Icon: Activity,
      };
  }
}

export default async function ActivityLogPage() {
  let logs: ActivityLogRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("activity_log")
          .select("id, action_type, before_data, after_data, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        logs = (data as ActivityLogRecord[]) || [];
      }
    } catch {
      // Gracefully handle missing config
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Activity Log"
        description="Track every decision made by your AI operations agent in real time."
      />

      {logs.length === 0 ? (
        <div className="animate-fade-up relative rounded-3xl border border-violet-100/90 bg-white/80 p-8 shadow-sm shadow-violet-500/5 backdrop-blur sm:p-12 text-center">
          <div className="bg-grid pointer-events-none absolute inset-0 rounded-3xl opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="relative mx-auto max-w-md space-y-4">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-600">
              <Activity className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No activity recorded yet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every operational email processed, suggestion drafted, and approval granted will appear
              here as a timeline — your audit trail.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-4 rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 font-semibold text-xs"
            >
              <Link href="/dashboard">Back to Main Dashboard</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const { label, bgClass, textClass, borderClass, Icon } = getActionMeta(log.action_type);
            const after = log.after_data ?? {};
            const subject = typeof after.subject === "string" ? after.subject : null;
            const senderEmail = typeof after.sender_email === "string" ? after.sender_email : null;

            return (
              <Card
                key={log.id}
                className="border-violet-100 bg-white p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${bgClass} ${textClass}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {subject ?? label}
                      </p>
                      {senderEmail && (
                        <p className="text-xs text-muted-foreground truncate">{senderEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${bgClass} ${textClass} ${borderClass}`}
                    >
                      {label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
