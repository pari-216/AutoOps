import {
  CheckCircle2,
  Clock3,
  Mail,
  Zap,
  ArrowRight,
  Webhook,
  User,
  Calendar,
} from "lucide-react";
import Link from "next/link";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format-date";

export const dynamic = "force-dynamic";

interface InboundEventRecord {
  id: string;
  sender_email: string | null;
  sender_name: string | null;
  subject: string | null;
  received_at: string | null;
  created_at: string;
  source: string;
}

export default async function DashboardPage() {
  let userEmail = "Guest User";
  let emailsIngested = 0;
  let pendingApproval = 0;
  let approvedToday = 0;
  let approvalRate = "0%";
  let dbConnected = false;
  let dbError: string | null = null;
  let recentEmails: InboundEventRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userEmail = user.email || "Authenticated User";
        dbConnected = true;

        // 1. Emails Ingested (count of inbound_events for current user)
        const { count: eventsCount, error: e1 } = await supabase
          .from("inbound_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (e1) console.error("[AutoOps Dashboard] emailsIngested query failed:", e1);
        emailsIngested = eventsCount || 0;

        // 2. Pending Approval (count of agent_actions where status = 'pending')
        const { count: pendingCount, error: e2 } = await supabase
          .from("agent_actions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "pending");

        if (e2) console.error("[AutoOps Dashboard] pendingApproval query failed:", e2);
        pendingApproval = pendingCount || 0;

        // 3. Approved Today (status IN ('approved', 'edited') updated today — UTC boundary)
        const todayStr = new Date().toISOString().split("T")[0];
        const { count: approvedCount, error: e3 } = await supabase
          .from("agent_actions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["approved", "edited"])
          .gte("updated_at", `${todayStr}T00:00:00.000Z`);

        if (e3) console.error("[AutoOps Dashboard] approvedToday query failed:", e3);
        approvedToday = approvedCount || 0;

        // 4. Approval Rate (approved + edited / total actions * 100)
        const { count: totalActions, error: e4 } = await supabase
          .from("agent_actions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const { count: processedTotal, error: e5 } = await supabase
          .from("agent_actions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["approved", "edited"]);

        if (e4) console.error("[AutoOps Dashboard] totalActions query failed:", e4);
        if (e5) console.error("[AutoOps Dashboard] processedTotal query failed:", e5);

        const total = totalActions || 0;
        const processed = processedTotal || 0;
        approvalRate = total > 0 ? `${Math.round((processed / total) * 100)}%` : "0%";

        // 5. Recent inbound emails
        const { data: recentData, error: e6 } = await supabase
          .from("inbound_events")
          .select("id, sender_email, sender_name, subject, received_at, created_at, source")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (e6) console.error("[AutoOps Dashboard] recentEmails query failed:", e6);
        recentEmails = (recentData as InboundEventRecord[]) || [];
      }
    } catch (err) {
      // Log unexpected errors (misconfigured env, network failure, etc.)
      const message = err instanceof Error ? err.message : String(err);
      console.error("[AutoOps Dashboard] Unexpected error loading metrics:", message);
      dbError = message;
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title={
          <>
            Good morning{" "}
            <span className="inline-block animate-float" aria-hidden="true">
              👋
            </span>
          </>
        }
        description={`Here's what AutoOps is handling for ${userEmail}.`}
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`px-3 py-1 text-xs font-semibold transition-colors ${
              dbError
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : dbConnected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-violet-200 bg-violet-50 text-violet-700"
            }`}
          >
            <span
              className={`mr-1.5 size-2 rounded-full ${
                dbError
                  ? "bg-rose-500"
                  : dbConnected
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-violet-500 animate-pulse-soft"
              }`}
            />
            {dbError
              ? "Metrics load error — check server logs"
              : dbConnected
              ? "Supabase PostgreSQL RLS Active"
              : "Phase 2 Preview"}
          </Badge>
        </div>
      </PageHeader>

      {/* Metrics */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Emails Ingested"
          value={emailsIngested}
          hint="Total emails received"
          icon={Mail}
          delay={0}
        />
        <MetricCard
          label="Pending Approval"
          value={pendingApproval}
          hint="Awaiting human review"
          icon={Clock3}
          delay={100}
        />
        <MetricCard
          label="Approved Today"
          value={approvedToday}
          hint="Approved or edited actions"
          icon={CheckCircle2}
          delay={200}
        />
        <MetricCard
          label="Approval Rate"
          value={approvalRate}
          hint="Approved or edited / total actions"
          icon={Zap}
          delay={300}
        />
      </section>

      {/* Operational Queue Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Clock3 className="size-5 text-violet-600" /> Operational Approval Queue
            </h2>
            <p className="text-xs text-muted-foreground">
              Review AI suggestions before any operational action is dispatched.
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 font-semibold text-xs"
          >
            <Link href="/dashboard/queue">
              View Approval Queue <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        {pendingApproval === 0 ? (
          <Card className="border-violet-100/90 bg-white/80 p-8 text-center shadow-xs rounded-2xl">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-600 mb-3">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No pending approvals</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Your approval queue is clear. New AI recommendations will appear here when incoming emails are processed.
            </p>
          </Card>
        ) : (
          <Card className="border-violet-100 bg-white p-6 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">
                You have {pendingApproval} pending item(s) awaiting review.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Urgent emails require your immediate attention before dispatch.
              </p>
            </div>
            <Button
              asChild
              className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold shrink-0"
            >
              <Link href="/dashboard/queue">Go to Approval Queue</Link>
            </Button>
          </Card>
        )}
      </section>

      {/* Phase 3 & 6 — Recent Inbound Emails */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Mail className="size-5 text-violet-600" /> Recent Inbound Emails
            </h2>
            <p className="text-xs text-muted-foreground">
              Emails ingested directly via Gmail API and inbound webhooks.
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 font-semibold text-xs"
          >
            <Link href="/dashboard/activity">
              Activity Log <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        {recentEmails.length === 0 ? (
          <Card className="border-violet-100/90 bg-white/80 p-8 text-center shadow-xs rounded-2xl">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-600 mb-3">
              <Webhook className="size-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No emails ingested yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
              Connect your Google account in Settings to enable direct Gmail ingestion.
              Incoming emails will appear here automatically.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentEmails.map((email) => (
              <Card
                key={email.id}
                className="border-violet-100 bg-white p-5 rounded-2xl shadow-xs hover:shadow-md hover:border-violet-200 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
                      <User className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {email.subject || "(no subject)"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {email.sender_name
                          ? `${email.sender_name} <${email.sender_email}>`
                          : (email.sender_email || "Unknown sender")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className="border-violet-200 bg-violet-50 text-violet-700 text-[10px] font-bold capitalize"
                    >
                      {email.source}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDateTime(email.received_at ?? email.created_at)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
