import {
  Clock3,
  CheckCircle2,
  XCircle,
  Inbox,
  AlertTriangle,
  MessageSquare,
  Info,
  ShieldAlert,
  User,
  Brain,
  Calendar,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentActionWithEvent {
  id: string;
  classification: string | null;
  suggested_action: string | null;
  drafted_reply: string | null;
  confidence: number | null;
  reason: string | null;
  status: string;
  created_at: string;
  // Joined from inbound_events
  inbound_events:
    | {
        sender_email: string | null;
        sender_name: string | null;
        subject: string | null;
        received_at: string | null;
      }
    | {
        sender_email: string | null;
        sender_name: string | null;
        subject: string | null;
        received_at: string | null;
      }[]
    | null;
}

// ---------------------------------------------------------------------------
// Classification visual config
// ---------------------------------------------------------------------------

type ClassificationKey = "urgent" | "needs_reply" | "fyi" | "spam_like";

const CLASSIFICATION_CONFIG: Record<
  ClassificationKey,
  {
    label: string;
    Icon: React.ElementType;
    badgeClass: string;
    borderClass: string;
    iconBgClass: string;
    iconTextClass: string;
  }
> = {
  urgent: {
    label: "Urgent",
    Icon: AlertTriangle,
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    borderClass: "border-l-rose-500",
    iconBgClass: "bg-rose-50",
    iconTextClass: "text-rose-600",
  },
  needs_reply: {
    label: "Needs Reply",
    Icon: MessageSquare,
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    borderClass: "border-l-amber-500",
    iconBgClass: "bg-amber-50",
    iconTextClass: "text-amber-600",
  },
  fyi: {
    label: "FYI",
    Icon: Info,
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    borderClass: "border-l-sky-500",
    iconBgClass: "bg-sky-50",
    iconTextClass: "text-sky-600",
  },
  spam_like: {
    label: "Spam-like",
    Icon: ShieldAlert,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    borderClass: "border-l-slate-400",
    iconBgClass: "bg-slate-50",
    iconTextClass: "text-slate-500",
  },
};

function getClassificationConfig(classification: string | null) {
  if (classification && classification in CLASSIFICATION_CONFIG) {
    return CLASSIFICATION_CONFIG[classification as ClassificationKey];
  }
  return {
    label: classification ?? "Unknown",
    Icon: Brain,
    badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
    borderClass: "border-l-violet-400",
    iconBgClass: "bg-violet-50",
    iconTextClass: "text-violet-600",
  };
}

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null;
  const pct = Math.round(confidence * 100);
  const colorClass =
    pct >= 90
      ? "bg-emerald-500"
      : pct >= 75
      ? "bg-amber-400"
      : pct >= 50
      ? "bg-orange-400"
      : "bg-rose-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-600 tabular-nums w-9 text-right">
        {pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Action Card
// ---------------------------------------------------------------------------

function AgentActionCard({ action }: { action: AgentActionWithEvent }) {
  const config = getClassificationConfig(action.classification);
  const { Icon } = config;
  const rawEvent = action.inbound_events;
  const event = Array.isArray(rawEvent) ? rawEvent[0] : rawEvent;
  const sender = event?.sender_name
    ? `${event.sender_name}${event.sender_email ? ` <${event.sender_email}>` : ""}`
    : event?.sender_email ?? "Unknown sender";

  const timestamp = event?.received_at ?? action.created_at;

  return (
    <Card
      className={`bg-white rounded-2xl shadow-xs border border-slate-100 border-l-4 ${config.borderClass} hover:shadow-md transition-all duration-200 overflow-hidden`}
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-xl ${config.iconBgClass} ${config.iconTextClass}`}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {event?.subject ?? "(no subject)"}
              </p>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <User className="size-3 shrink-0" />
                {sender}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className={`text-[10px] font-bold px-2 py-0.5 ${config.badgeClass}`}
            >
              {config.label}
            </Badge>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar className="size-3" />
              {new Date(timestamp).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Confidence */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Brain className="size-3" /> AI Confidence
          </p>
          <ConfidenceBar confidence={action.confidence} />
        </div>

        {/* Reasoning */}
        {action.reason && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              AI Reasoning
            </p>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
              {action.reason}
            </p>
          </div>
        )}

        {/* Drafted reply */}
        {action.drafted_reply && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Suggested Reply
            </p>
            <pre className="text-xs text-slate-700 leading-relaxed bg-violet-50/60 rounded-xl p-3 border border-violet-100 font-sans whitespace-pre-wrap">
              {action.drafted_reply}
            </pre>
          </div>
        )}

        {/* Status pill */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <Badge
            variant="outline"
            className="text-[10px] font-bold border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5"
          >
            <Clock3 className="size-3 mr-1" />
            Pending Approval
          </Badge>
          <span className="text-[10px] text-slate-400 font-mono">{action.id.slice(0, 8)}…</span>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ApprovalQueuePage() {
  let pendingActions: AgentActionWithEvent[] = [];
  let approvedActions: AgentActionWithEvent[] = [];
  let rejectedActions: AgentActionWithEvent[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Join agent_actions with inbound_events for sender/subject context
        const select =
          "id, classification, suggested_action, drafted_reply, confidence, reason, status, created_at, inbound_events(sender_email, sender_name, subject, received_at)";

        const { data: pendingData } = await supabase
          .from("agent_actions")
          .select(select)
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        const { data: approvedData } = await supabase
          .from("agent_actions")
          .select(select)
          .eq("user_id", user.id)
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        const { data: rejectedData } = await supabase
          .from("agent_actions")
          .select(select)
          .eq("user_id", user.id)
          .eq("status", "rejected")
          .order("created_at", { ascending: false });

        pendingActions = (pendingData as unknown as AgentActionWithEvent[]) || [];
        approvedActions = (approvedData as unknown as AgentActionWithEvent[]) || [];
        rejectedActions = (rejectedData as unknown as AgentActionWithEvent[]) || [];
      }
    } catch {
      // Gracefully handle missing config
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Approval Queue"
        description="Review AI decisions before any operational action is taken."
      />

      <Tabs defaultValue="pending" className="gap-6">
        <TabsList className="h-12 rounded-xl border border-violet-100 bg-white/80 p-1.5 shadow-sm backdrop-blur">
          <TabsTrigger
            value="pending"
            className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-violet-500/20"
          >
            <Clock3 className="size-4" />
            Pending ({pendingActions.length})
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/20"
          >
            <CheckCircle2 className="size-4" />
            Approved ({approvedActions.length})
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-rose-500/20"
          >
            <XCircle className="size-4" />
            Rejected ({rejectedActions.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4 pt-4">
          {pendingActions.length === 0 ? (
            <Card className="border-violet-100/90 bg-white/80 p-12 text-center shadow-xs rounded-2xl">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-600 mb-4">
                <Inbox className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No pending approvals</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
                When your AI agent classifies an incoming email, it will land here for
                your review before anything is dispatched.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingActions.map((action) => (
                <AgentActionCard key={action.id} action={action} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4 pt-4">
          {approvedActions.length === 0 ? (
            <Card className="border-violet-100/90 bg-white/80 p-12 text-center shadow-xs rounded-2xl">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
                <CheckCircle2 className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Nothing approved yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Approvals you grant (Phase 5) will be listed here with full execution records.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvedActions.map((action) => (
                <AgentActionCard key={action.id} action={action} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="space-y-4 pt-4">
          {rejectedActions.length === 0 ? (
            <Card className="border-violet-100/90 bg-white/80 p-12 text-center shadow-xs rounded-2xl">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <XCircle className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Nothing rejected yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Suggestions you decline will be archived here to help train your agent.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {rejectedActions.map((action) => (
                <AgentActionCard key={action.id} action={action} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
