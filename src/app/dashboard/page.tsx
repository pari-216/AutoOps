import {
  CheckCircle2,
  Clock3,
  Inbox,
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
  let emailsProcessed = 0;
  let pendingApproval = 0;
  let approvedToday = 0;
  let automationRate = "0%";
  let dbConnected = false;
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

        // 1. Emails Processed (count of inbound_events for current user)
        const { count: eventsCount } = await supabase
          .from("inbound_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        emailsProcessed = eventsCount || 0;

        // 2. Pending Approval (count of agent_actions where status = 'pending')
        const { count: pendingCount } = await supabase
          .from("agent_actions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "pending");

        pendingApproval = pendingCount || 0;

        // 3. Approved Today
        const todayStr = new Date().toISOString().split("T")[0];
        const { count: approvedCount } = await supabase
          .from("agent_actions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "approved")
          .gte("created_at", `${todayStr}T00:00:00.000Z`);

        approvedToday = approvedCount || 0;

        // 4. Automation Rate (approved / total * 100)
        const { count: totalActions } = await supabase
          .from("agent_actions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const { count: allApproved } = await supabase
          .from("agent_actions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "approved");

        const total = totalActions || 0;
        const approvedTotal = allApproved || 0;
        automationRate = total > 0 ? `${Math.round((approvedTotal / total) * 100)}%` : "0%";

        // 5. Recent inbound emails (Phase 3)
        const { data: recentData } = await supabase
          .from("inbound_events")
          .select("id, sender_email, sender_name, subject, received_at, created_at, source")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        recentEmails = (recentData as InboundEventRecord[]) || [];
      }
    } catch {
      // Gracefully handle unconfigured or network errors
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
              dbConnected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-violet-200 bg-violet-50 text-violet-700"
            }`}
          >
            <span
              className={`mr-1.5 size-2 rounded-full ${
                dbConnected
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-violet-500 animate-pulse-soft"
              }`}
            />
            {dbConnected ? "Supabase PostgreSQL RLS Active" : "Phase 2 Preview"}
          </Badge>
        </div>
      </PageHeader>

      {/* Real Supabase Metrics */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Emails Processed"
          value={emailsProcessed}
          hint="From inbound_events table"
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
          hint="Approved agent actions"
          icon={CheckCircle2}
          delay={200}
        />
        <MetricCard
          label="Automation Rate"
          value={automationRate}
          hint="Approved / total actions"
          icon={Zap}
          delay={300}
        />
      </section>

      {/* Operational Queue Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Inbox className="size-5 text-violet-600" /> Operational Approval Queue
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
              Your Supabase `agent_actions` queue is clear. In Phase 3, incoming Zapier emails will populate this queue automatically.
            </p>
          </Card>
        ) : (
          <Card className="border-violet-100 bg-white p-6 rounded-2xl shadow-xs">
            <p className="text-sm font-bold text-foreground">
              You have {pendingApproval} pending item(s) awaiting review.
            </p>
            <Button
              asChild
              className="mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold"
            >
              <Link href="/dashboard/queue">Go to Approval Queue</Link>
            </Button>
          </Card>
        )}
      </section>

      {/* Phase 3 — Recent Inbound Emails */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Mail className="size-5 text-violet-600" /> Recent Inbound Emails
            </h2>
            <p className="text-xs text-muted-foreground">
              Emails ingested via the Gmail → Zapier → AutoOps webhook pipeline.
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
              Connect your Gmail account via Zapier and point the webhook to{" "}
              <code className="font-mono bg-violet-50 px-1 rounded">/api/webhooks/inbound</code>.
              Incoming emails will appear here instantly.
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
                      {new Date(email.received_at ?? email.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
