"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Mail,
  Pencil,
  Search,
  Send,
  ServerCrash,
  Settings,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format-date";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivityLogRecord {
  id: string;
  action_type: string;
  event_id: string | null;
  agent_action_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Filter category definitions
// ---------------------------------------------------------------------------

export type FilterCategory =
  | "all"
  | "ai_processing"
  | "approvals"
  | "rejections"
  | "execution"
  | "errors";

interface FilterTab {
  value: FilterCategory;
  label: string;
  Icon: React.ElementType;
  eventTypes: string[];
  activeClass: string;
}

const FILTER_TABS: FilterTab[] = [
  {
    value: "all",
    label: "All",
    Icon: Activity,
    eventTypes: [], // empty = match all
    activeClass:
      "data-[active=true]:bg-slate-900 data-[active=true]:text-white",
  },
  {
    value: "ai_processing",
    label: "AI Processing",
    Icon: Bot,
    eventTypes: ["email_received", "agent_processed"],
    activeClass:
      "data-[active=true]:bg-violet-600 data-[active=true]:text-white",
  },
  {
    value: "approvals",
    label: "Approvals",
    Icon: CheckCircle2,
    eventTypes: ["action_approved", "action_edited"],
    activeClass:
      "data-[active=true]:bg-emerald-600 data-[active=true]:text-white",
  },
  {
    value: "rejections",
    label: "Rejections",
    Icon: XCircle,
    eventTypes: ["action_rejected"],
    activeClass:
      "data-[active=true]:bg-rose-600 data-[active=true]:text-white",
  },
  {
    value: "execution",
    label: "Execution",
    Icon: Send,
    eventTypes: [
      "gmail_reply_started",
      "gmail_reply_sent",
      "calendar_event_started",
      "calendar_event_created",
      "zapier_dispatch_started",
      "zapier_dispatch_succeeded",
    ],
    activeClass:
      "data-[active=true]:bg-blue-600 data-[active=true]:text-white",
  },
  {
    value: "errors",
    label: "Errors",
    Icon: AlertTriangle,
    eventTypes: [
      "agent_error",
      "gmail_reply_failed",
      "calendar_event_failed",
      "zapier_dispatch_failed",
    ],
    activeClass:
      "data-[active=true]:bg-amber-600 data-[active=true]:text-white",
  },
];

// ---------------------------------------------------------------------------
// Event type → visual config
// ---------------------------------------------------------------------------

interface ActionMeta {
  label: string;
  description: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  Icon: React.ElementType;
}

function getActionMeta(
  actionType: string,
  afterData: Record<string, unknown> | null,
  beforeData: Record<string, unknown> | null
): ActionMeta {
  const after = afterData ?? {};
  const before = beforeData ?? {};

  // Shared helpers
  const subject = typeof after.subject === "string" ? after.subject : null;
  const senderEmail =
    typeof after.sender_email === "string" ? after.sender_email : null;
  const recipient =
    typeof after.recipient === "string" ? after.recipient : null;
  const classification =
    typeof after.classification === "string" ? after.classification : null;
  const confidence =
    typeof after.confidence === "number" ? after.confidence : null;
  const errorMsg = typeof after.error === "string" ? after.error : null;
  const beforeStatus =
    typeof before.status === "string" ? before.status : null;
  const afterStatus = typeof after.status === "string" ? after.status : null;
  const messageId = typeof after.messageId === "string" ? after.messageId : null;
  const eventId = typeof after.email === "string" ? after.email : null;
  const email = typeof after.email === "string" ? after.email : null;

  switch (actionType) {
    // ── Inbound Email ─────────────────────────────────────────────────────
    case "email_received":
      return {
        label: "Email Received",
        description: subject
          ? `"${subject}"${senderEmail ? ` from ${senderEmail}` : ""}`
          : senderEmail
          ? `From ${senderEmail}`
          : "Inbound email ingested via Gmail API",
        bgClass: "bg-violet-50",
        textClass: "text-violet-700",
        borderClass: "border-violet-200",
        Icon: Mail,
      };

    // ── AI Processing ─────────────────────────────────────────────────────
    case "agent_processed":
      return {
        label: "AI Processed",
        description:
          classification
            ? `Classified as "${classification}"${confidence !== null ? ` (${Math.round(confidence * 100)}% confidence)` : ""}`
            : "AI agent processed email and created recommendation",
        bgClass: "bg-violet-50",
        textClass: "text-violet-700",
        borderClass: "border-violet-200",
        Icon: Bot,
      };

    case "agent_error":
      return {
        label: "AI Error",
        description: errorMsg
          ? `AI processing failed: ${errorMsg.slice(0, 120)}`
          : "AI agent encountered an error processing this email",
        bgClass: "bg-amber-50",
        textClass: "text-amber-700",
        borderClass: "border-amber-200",
        Icon: AlertTriangle,
      };

    // ── Approvals ─────────────────────────────────────────────────────────
    case "action_approved":
      return {
        label: "Action Approved",
        description:
          beforeStatus && afterStatus
            ? `Status changed: ${beforeStatus} → ${afterStatus}`
            : "Human approved AI recommendation — dispatching action",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        borderClass: "border-emerald-200",
        Icon: CheckCircle2,
      };

    case "action_edited":
      return {
        label: "Edited & Approved",
        description: "Human edited the AI draft and approved — dispatching action",
        bgClass: "bg-purple-50",
        textClass: "text-purple-700",
        borderClass: "border-purple-200",
        Icon: Pencil,
      };

    // ── Rejections ────────────────────────────────────────────────────────
    case "action_rejected":
      return {
        label: "Action Rejected",
        description: "Human rejected the AI recommendation — no action dispatched",
        bgClass: "bg-rose-50",
        textClass: "text-rose-700",
        borderClass: "border-rose-200",
        Icon: XCircle,
      };

    // ── Gmail Execution ───────────────────────────────────────────────────
    case "gmail_reply_started":
      return {
        label: "Sending Reply…",
        description: "Gmail reply execution started",
        bgClass: "bg-blue-50",
        textClass: "text-blue-700",
        borderClass: "border-blue-200",
        Icon: Send,
      };

    case "gmail_reply_sent":
      return {
        label: "Reply Sent",
        description: recipient
          ? `Reply sent successfully to ${recipient}${messageId ? ` (msg: ${messageId.slice(0, 16)}…)` : ""}`
          : "Gmail reply sent successfully",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        borderClass: "border-emerald-200",
        Icon: Send,
      };

    case "gmail_reply_failed":
      return {
        label: "Reply Failed",
        description: errorMsg
          ? `Gmail reply failed: ${errorMsg.slice(0, 120)}`
          : "Gmail API execution failed",
        bgClass: "bg-rose-50",
        textClass: "text-rose-700",
        borderClass: "border-rose-200",
        Icon: AlertTriangle,
      };

    // ── Calendar Execution ────────────────────────────────────────────────
    case "calendar_event_started":
      return {
        label: "Creating Event…",
        description: "Google Calendar event creation started",
        bgClass: "bg-blue-50",
        textClass: "text-blue-700",
        borderClass: "border-blue-200",
        Icon: Calendar,
      };

    case "calendar_event_created": {
      const calEventId =
        typeof after.eventId === "string" ? after.eventId : null;
      return {
        label: "Event Created",
        description: calEventId
          ? `Calendar event created successfully (ID: ${calEventId.slice(0, 20)}…)`
          : "Google Calendar event created successfully",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        borderClass: "border-emerald-200",
        Icon: Calendar,
      };
    }

    case "calendar_event_failed":
      return {
        label: "Calendar Failed",
        description: errorMsg
          ? `Calendar creation failed: ${errorMsg.slice(0, 120)}`
          : "Google Calendar API execution failed",
        bgClass: "bg-rose-50",
        textClass: "text-rose-700",
        borderClass: "border-rose-200",
        Icon: AlertTriangle,
      };

    // ── Zapier Dispatch ───────────────────────────────────────────────────
    case "zapier_dispatch_started":
      return {
        label: "Zapier Dispatch…",
        description: "Outbound Zapier webhook dispatch started",
        bgClass: "bg-amber-50",
        textClass: "text-amber-700",
        borderClass: "border-amber-200",
        Icon: Zap,
      };

    case "zapier_dispatch_succeeded":
      return {
        label: "Zapier Succeeded",
        description: "Outbound Zapier webhook dispatched successfully",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        borderClass: "border-emerald-200",
        Icon: Zap,
      };

    case "zapier_dispatch_failed":
      return {
        label: "Zapier Failed",
        description: errorMsg
          ? `Zapier dispatch failed: ${errorMsg.slice(0, 120)}`
          : "Outbound Zapier webhook dispatch failed",
        bgClass: "bg-rose-50",
        textClass: "text-rose-700",
        borderClass: "border-rose-200",
        Icon: AlertTriangle,
      };

    // ── Google Integration ────────────────────────────────────────────────
    case "google_connected":
      return {
        label: "Google Connected",
        description: email
          ? `Google account connected: ${email}`
          : "Google account connected successfully",
        bgClass: "bg-blue-50",
        textClass: "text-blue-700",
        borderClass: "border-blue-200",
        Icon: Settings,
      };

    case "google_disconnected":
      return {
        label: "Google Disconnected",
        description: "Google account disconnected",
        bgClass: "bg-slate-50",
        textClass: "text-slate-700",
        borderClass: "border-slate-200",
        Icon: Settings,
      };

    // ── Default ───────────────────────────────────────────────────────────
    default:
      return {
        label: actionType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: "Automated system event",
        bgClass: "bg-slate-50",
        textClass: "text-slate-700",
        borderClass: "border-slate-200",
        Icon: Activity,
      };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesFilter(log: ActivityLogRecord, category: FilterCategory): boolean {
  if (category === "all") return true;
  const tab = FILTER_TABS.find((t) => t.value === category);
  if (!tab) return true;
  return tab.eventTypes.includes(log.action_type);
}

function matchesSearch(log: ActivityLogRecord, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const after = log.after_data ?? {};
  const subject = typeof after.subject === "string" ? after.subject.toLowerCase() : "";
  const senderEmail =
    typeof after.sender_email === "string" ? after.sender_email.toLowerCase() : "";
  const recipient =
    typeof after.recipient === "string" ? after.recipient.toLowerCase() : "";
  const error = typeof after.error === "string" ? after.error.toLowerCase() : "";
  const classification =
    typeof after.classification === "string" ? after.classification.toLowerCase() : "";
  const actionType = log.action_type.toLowerCase();

  return (
    actionType.includes(q) ||
    subject.includes(q) ||
    senderEmail.includes(q) ||
    recipient.includes(q) ||
    error.includes(q) ||
    classification.includes(q)
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

interface ActivityLogClientProps {
  initialLogs: ActivityLogRecord[];
  fetchError: string | null;
  userId: string;
}

export function ActivityLogClient({
  initialLogs,
  fetchError,
  userId,
}: ActivityLogClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [logs, setLogs] = useState<ActivityLogRecord[]>(initialLogs);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync server-fetched data when page refreshes
  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  // Supabase Realtime: refresh page when activity_log changes for this user
  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    try {
      const supabase = createClient();
      channel = supabase
        .channel("realtime_activity_log")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activity_log",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (mounted) {
              startTransition(() => {
                router.refresh();
              });
            }
          }
        )
        .subscribe();
    } catch {
      // Non-blocking — realtime is best-effort
    }

    return () => {
      mounted = false;
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [userId, router]);

  // Filtered & searched logs
  const filteredLogs = logs.filter(
    (log) => matchesFilter(log, activeFilter) && matchesSearch(log, searchQuery)
  );

  // Category counts
  const categoryCounts = FILTER_TABS.reduce(
    (acc, tab) => {
      acc[tab.value] =
        tab.value === "all"
          ? logs.length
          : logs.filter((log) => tab.eventTypes.includes(log.action_type)).length;
      return acc;
    },
    {} as Record<FilterCategory, number>
  );

  // ── Error State ─────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="animate-fade-up relative rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm sm:p-12 text-center">
        <div className="relative mx-auto max-w-md space-y-4">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600">
            <ServerCrash className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-rose-900">Failed to load activity</h3>
          <p className="text-xs text-rose-700 leading-relaxed font-mono bg-rose-100 rounded-lg p-2 text-left">
            {fetchError}
          </p>
          <p className="text-xs text-rose-600">
            The database query returned an error. Check your Supabase configuration and RLS policies.
          </p>
          <Button
            onClick={() => startTransition(() => router.refresh())}
            variant="outline"
            className="mt-4 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold text-xs"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.value;
            const count = categoryCounts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveFilter(tab.value)}
                data-active={isActive}
                className={[
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 border",
                  isActive
                    ? `${tab.activeClass.replace("data-[active=true]:", "")} border-transparent shadow-sm`
                    : "border-violet-100 bg-white text-slate-600 hover:bg-violet-50 hover:text-violet-800",
                ].join(" ")}
              >
                <tab.Icon className="size-3.5 shrink-0" />
                {tab.label}
                {count > 0 && (
                  <span
                    className={[
                      "ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums",
                      isActive ? "bg-white/20" : "bg-violet-100 text-violet-700",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-0 sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search activity…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-xl border border-violet-100 bg-white pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Activity List */}
      {filteredLogs.length === 0 ? (
        logs.length === 0 ? (
          // ── True empty state ─────────────────────────────────────────────
          <div className="animate-fade-up relative rounded-3xl border border-violet-100/90 bg-white/80 p-8 shadow-sm shadow-violet-500/5 backdrop-blur sm:p-12 text-center">
            <div className="bg-grid pointer-events-none absolute inset-0 rounded-3xl opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            <div className="relative mx-auto max-w-md space-y-4">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                <Activity className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No activity recorded yet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every operational email processed, AI suggestion drafted, approval granted, and reply
                sent will appear here — your complete audit trail.
              </p>
            </div>
          </div>
        ) : (
          // ── Filtered empty state ─────────────────────────────────────────
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-8 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-violet-50 text-violet-500 mb-3">
              <Search className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No matching activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different filter or clear your search.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveFilter("all");
                setSearchQuery("");
              }}
              className="mt-3 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"
            >
              Clear filters
            </Button>
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => {
            const { label, description, bgClass, textClass, borderClass, Icon } =
              getActionMeta(log.action_type, log.after_data, log.before_data);

            const isError = [
              "agent_error",
              "gmail_reply_failed",
              "calendar_event_failed",
              "zapier_dispatch_failed",
            ].includes(log.action_type);

            return (
              <Card
                key={log.id}
                className={[
                  "border-violet-100 bg-white p-4 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200",
                  isError ? "border-rose-100 bg-rose-50/30" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Icon */}
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${bgClass} ${textClass}`}
                    >
                      <Icon className="size-4" />
                    </div>

                    {/* Text */}
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-bold text-foreground truncate">{label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {description}
                      </p>
                    </div>
                  </div>

                  {/* Badge + Timestamp */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${bgClass} ${textClass} ${borderClass} whitespace-nowrap`}
                    >
                      {label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Result count */}
      {logs.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          Showing {filteredLogs.length} of {logs.length} events
        </p>
      )}
    </div>
  );
}
