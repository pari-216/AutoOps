"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  Pencil,
  Check,
  X,
  Loader2,
  Filter,
  Search,
  CheckCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentActionWithEvent {
  id: string;
  user_id: string;
  event_id: string | null;
  classification: string | null;
  suggested_action: string | null;
  drafted_reply: string | null;
  original_drafted_reply?: string | null;
  confidence: number | null;
  reason: string | null;
  status: "pending" | "approved" | "edited" | "rejected" | "executing" | "executed" | "failed" | string;
  execution_status?: "unexecuted" | "executing" | "executed" | "failed" | string | null;
  executed_at?: string | null;
  execution_error?: string | null;
  external_action_id?: string | null;
  created_at: string;
  processed_at?: string | null;
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

interface ApprovalQueueClientProps {
  initialActions: AgentActionWithEvent[];
  userId: string;
}

// ---------------------------------------------------------------------------
// Sorting helper
// 1. urgent
// 2. needs_reply
// 3. fyi
// 4. spam_like
// Within same classification: newest items first
// ---------------------------------------------------------------------------

const CLASSIFICATION_ORDER: Record<string, number> = {
  urgent: 1,
  needs_reply: 2,
  fyi: 3,
  spam_like: 4,
};

function sortAgentActions(actions: AgentActionWithEvent[]): AgentActionWithEvent[] {
  return [...actions].sort((a, b) => {
    const orderA = CLASSIFICATION_ORDER[a.classification ?? ""] ?? 99;
    const orderB = CLASSIFICATION_ORDER[b.classification ?? ""] ?? 99;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const rawEventA = a.inbound_events;
    const eventA = Array.isArray(rawEventA) ? rawEventA[0] : rawEventA;
    const timeA = new Date(eventA?.received_at ?? a.created_at).getTime();

    const rawEventB = b.inbound_events;
    const eventB = Array.isArray(rawEventB) ? rawEventB[0] : rawEventB;
    const timeB = new Date(eventB?.received_at ?? b.created_at).getTime();

    return timeB - timeA;
  });
}

// ---------------------------------------------------------------------------
// Visual config
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
// Action Card Component
// ---------------------------------------------------------------------------

function ActionCard({
  action,
  onApprove,
  onEditAndApprove,
  onReject,
  isProcessing,
}: {
  action: AgentActionWithEvent;
  onApprove: (id: string) => void;
  onEditAndApprove: (id: string, newReply: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(action.drafted_reply || "");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const config = getClassificationConfig(action.classification);
  const { Icon } = config;
  const rawEvent = action.inbound_events;
  const event = Array.isArray(rawEvent) ? rawEvent[0] : rawEvent;

  const senderName = event?.sender_name;
  const senderEmail = event?.sender_email;
  const senderDisplay = senderName
    ? `${senderName}${senderEmail ? ` <${senderEmail}>` : ""}`
    : senderEmail ?? "Unknown sender";

  const timestamp = event?.received_at ?? action.created_at;

  const isPending = action.status === "pending";
  const isApproved = action.status === "approved";
  const isEdited = action.status === "edited";
  const isRejected = action.status === "rejected";

  const handleSaveEdit = () => {
    const trimmed = editedText.trim();
    if (!trimmed) {
      setEditError("Reply cannot be empty.");
      return;
    }
    if (trimmed.length > 5000) {
      setEditError("Reply exceeds 5,000 characters limit.");
      return;
    }
    setEditError(null);
    onEditAndApprove(action.id, trimmed);
    setIsEditing(false);
  };

  return (
    <Card
      className={`bg-white rounded-2xl shadow-xs border border-slate-100 border-l-4 ${config.borderClass} hover:shadow-md transition-all duration-200 overflow-hidden relative`}
    >
      <div className="p-5 space-y-4">
        {/* Top Bar / Header */}
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
                {senderDisplay}
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

        {/* AI Confidence */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Brain className="size-3" /> AI Confidence
          </p>
          <ConfidenceBar confidence={action.confidence} />
        </div>

        {/* AI Reasoning */}
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

        {/* Drafted reply / Edit view */}
        {action.drafted_reply && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {isEdited
                  ? "Approved Reply (Human Edited)"
                  : isApproved
                  ? "Approved Reply"
                  : "Suggested Reply"}
              </p>

              {isPending && !isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditedText(action.drafted_reply || "");
                    setEditError(null);
                  }}
                  className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 hover:underline flex items-center gap-1"
                >
                  <Pencil className="size-3" /> Edit reply
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2 pt-1">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={4}
                  className="w-full text-xs text-slate-800 bg-white rounded-xl p-3 border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-sans leading-relaxed resize-y shadow-inner"
                  placeholder="Type edited reply..."
                  disabled={isProcessing}
                />
                {editError && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="size-3" /> {editError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedText(action.drafted_reply || "");
                      setEditError(null);
                    }}
                    disabled={isProcessing}
                    className="h-8 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    <X className="size-3.5 mr-1" /> Cancel
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isProcessing}
                    className="h-8 text-xs font-semibold bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-lg shadow-xs"
                  >
                    {isProcessing ? (
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCheck className="size-3.5 mr-1" />
                    )}
                    Save & Approve
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <pre className="text-xs text-slate-700 leading-relaxed bg-violet-50/60 rounded-xl p-3 border border-violet-100 font-sans whitespace-pre-wrap">
                  {action.drafted_reply}
                </pre>
                {action.original_drafted_reply &&
                  action.original_drafted_reply !== action.drafted_reply && (
                    <details className="text-[10px] text-slate-500 mt-1 cursor-pointer">
                      <summary className="hover:text-slate-700 font-medium">
                        View original AI draft
                      </summary>
                      <pre className="mt-1 text-[11px] text-slate-600 bg-slate-100 rounded-lg p-2 font-sans whitespace-pre-wrap border border-slate-200">
                        {action.original_drafted_reply}
                      </pre>
                    </details>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Footer / Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {isPending && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5"
              >
                <Clock3 className="size-3 mr-1" /> Pending Approval
              </Badge>
            )}
            {isApproved && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5"
              >
                <CheckCircle2 className="size-3 mr-1" /> Approved
              </Badge>
            )}
            {isEdited && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-purple-200 bg-purple-50 text-purple-700 px-2 py-0.5"
              >
                <Pencil className="size-3 mr-1" /> Edited & Approved
              </Badge>
            )}
            {isRejected && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5"
              >
                <XCircle className="size-3 mr-1" /> Rejected
              </Badge>
            )}

            {/* Execution status badges */}
            {action.execution_status === "executed" && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-emerald-200 bg-emerald-100 text-emerald-800 px-2 py-0.5"
              >
                <CheckCircle2 className="size-3 mr-1" /> Executed
              </Badge>
            )}
            {action.execution_status === "executing" && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-sky-200 bg-sky-50 text-sky-700 px-2 py-0.5"
              >
                <Loader2 className="size-3 animate-spin mr-1" /> Executing...
              </Badge>
            )}
            {action.execution_status === "failed" && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-rose-300 bg-rose-100 text-rose-800 px-2 py-0.5"
              >
                <AlertTriangle className="size-3 mr-1" /> Execution Failed
              </Badge>
            )}

            <span className="text-[10px] text-slate-400 font-mono">
              ID: {action.id.slice(0, 8)}…
            </span>
          </div>

          {/* Execution details */}
          {action.execution_error && (
            <p className="text-[11px] font-semibold text-rose-600 w-full pt-1 border-t border-rose-100">
              Execution Error: {action.execution_error}
            </p>
          )}
          {action.external_action_id && (
            <p className="text-[10px] text-slate-500 font-mono w-full">
              External ID: {action.external_action_id}
            </p>
          )}

          {/* Pending Action Buttons */}
          {isPending && !isEditing && (
            <div className="flex items-center gap-2">
              {showRejectConfirm ? (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl p-1 animate-fade-in">
                  <span className="text-[11px] font-bold text-rose-800 px-1">
                    Reject action?
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isProcessing}
                    onClick={() => {
                      onReject(action.id);
                      setShowRejectConfirm(false);
                    }}
                    className="h-7 text-[11px] px-2.5 rounded-lg font-bold"
                  >
                    {isProcessing ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      "Yes, Reject"
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isProcessing}
                    onClick={() => setShowRejectConfirm(false)}
                    className="h-7 text-[11px] px-2 rounded-lg text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => setShowRejectConfirm(true)}
                    className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 rounded-xl transition-all"
                  >
                    <XCircle className="size-3.5 mr-1" /> Reject
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => {
                      setIsEditing(true);
                      setEditedText(action.drafted_reply || "");
                      setEditError(null);
                    }}
                    className="h-8 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 rounded-xl transition-all font-semibold"
                  >
                    <Pencil className="size-3.5 mr-1" /> Edit & Approve
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => onApprove(action.id)}
                    className="h-8 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-xs transition-all"
                  >
                    {isProcessing ? (
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <Check className="size-3.5 mr-1" />
                    )}
                    Approve
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Queue Client Component
// ---------------------------------------------------------------------------

export function ApprovalQueueClient({
  initialActions,
  userId,
}: ApprovalQueueClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [actions, setActions] = useState<AgentActionWithEvent[]>(initialActions);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters state
  const [statusTab, setStatusTab] = useState<string>("pending");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Toast / feedback message state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Sync state when props update
  useEffect(() => {
    setActions(initialActions);
  }, [initialActions]);

  // Set up Supabase Realtime listener
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("realtime_agent_actions_queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_actions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          startTransition(() => {
            router.refresh();
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  const showNotification = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Handler: Approve
  const handleApprove = async (actionId: string) => {
    if (processingId) return;
    setProcessingId(actionId);

    try {
      const res = await fetch("/api/actions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_id: actionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        showNotification(data.error || "Failed to approve action.", "error");
      } else {
        showNotification("Action approved successfully.", "success");
        // Optimistic state update
        setActions((prev) =>
          prev.map((a) =>
            a.id === actionId
              ? { ...a, status: "approved", processed_at: new Date().toISOString() }
              : a
          )
        );
        startTransition(() => router.refresh());
      }
    } catch {
      showNotification("Network error while approving action.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Handler: Edit & Approve
  const handleEditAndApprove = async (actionId: string, newReply: string) => {
    if (processingId) return;
    setProcessingId(actionId);

    try {
      const res = await fetch("/api/actions/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: actionId,
          edited_reply: newReply,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showNotification(data.error || "Failed to edit & approve action.", "error");
      } else {
        showNotification("Reply edited and approved.", "success");
        // Optimistic update
        setActions((prev) =>
          prev.map((a) =>
            a.id === actionId
              ? {
                  ...a,
                  status: "edited",
                  original_drafted_reply: a.original_drafted_reply || a.drafted_reply,
                  drafted_reply: newReply,
                  processed_at: new Date().toISOString(),
                }
              : a
          )
        );
        startTransition(() => router.refresh());
      }
    } catch {
      showNotification("Network error while editing action.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Handler: Reject
  const handleReject = async (actionId: string) => {
    if (processingId) return;
    setProcessingId(actionId);

    try {
      const res = await fetch("/api/actions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_id: actionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        showNotification(data.error || "Failed to reject action.", "error");
      } else {
        showNotification("Action rejected.", "success");
        // Optimistic update
        setActions((prev) =>
          prev.map((a) =>
            a.id === actionId
              ? { ...a, status: "rejected", processed_at: new Date().toISOString() }
              : a
          )
        );
        startTransition(() => router.refresh());
      }
    } catch {
      showNotification("Network error while rejecting action.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Filter & Sort
  const filteredActions = actions.filter((action) => {
    // 1. Status Filter
    if (statusTab === "pending" && action.status !== "pending") return false;
    if (statusTab === "approved" && action.status !== "approved") return false;
    if (statusTab === "edited" && action.status !== "edited") return false;
    if (statusTab === "rejected" && action.status !== "rejected") return false;

    // 2. Classification Filter
    if (classificationFilter !== "all" && action.classification !== classificationFilter) {
      return false;
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const rawEvent = action.inbound_events;
      const event = Array.isArray(rawEvent) ? rawEvent[0] : rawEvent;
      const subject = (event?.subject || "").toLowerCase();
      const senderName = (event?.sender_name || "").toLowerCase();
      const senderEmail = (event?.sender_email || "").toLowerCase();
      const reason = (action.reason || "").toLowerCase();

      if (
        !subject.includes(q) &&
        !senderName.includes(q) &&
        !senderEmail.includes(q) &&
        !reason.includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  const sortedActions = sortAgentActions(filteredActions);

  // Counts for status tabs
  const pendingCount = actions.filter((a) => a.status === "pending").length;
  const approvedCount = actions.filter((a) => a.status === "approved").length;
  const editedCount = actions.filter((a) => a.status === "edited").length;
  const rejectedCount = actions.filter((a) => a.status === "rejected").length;
  const allCount = actions.length;

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border transition-all animate-bounce-short ${
            toastMessage.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-700"
              : "bg-rose-900 text-rose-100 border-rose-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-75"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Tabs & Search controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full sm:w-auto">
          <TabsList className="h-12 rounded-xl border border-violet-100 bg-white/80 p-1.5 shadow-sm backdrop-blur flex-wrap h-auto">
            <TabsTrigger
              value="pending"
              className="rounded-lg px-3 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-violet-500/20"
            >
              <Clock3 className="size-3.5 mr-1" />
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="rounded-lg px-3 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/20"
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              Approved ({approvedCount})
            </TabsTrigger>
            <TabsTrigger
              value="edited"
              className="rounded-lg px-3 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-purple-500/20"
            >
              <Pencil className="size-3.5 mr-1" />
              Edited ({editedCount})
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="rounded-lg px-3 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-rose-500/20"
            >
              <XCircle className="size-3.5 mr-1" />
              Rejected ({rejectedCount})
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="rounded-lg px-3 py-2 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              All ({allCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Classification Filter & Search */}
        <div className="flex items-center gap-2">
          {/* Classification Pill Filter */}
          <div className="relative flex items-center">
            <Filter className="size-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="h-10 text-xs font-semibold bg-white border border-violet-100 rounded-xl pl-8 pr-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-xs appearance-none cursor-pointer"
            >
              <option value="all">All Classifications</option>
              <option value="urgent">Urgent</option>
              <option value="needs_reply">Needs Reply</option>
              <option value="fyi">FYI</option>
              <option value="spam_like">Spam-like</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex items-center flex-1 sm:w-48">
            <Search className="size-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-10 text-xs bg-white border border-violet-100 rounded-xl pl-8 pr-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-xs w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main List Display */}
      {sortedActions.length === 0 ? (
        <Card className="border-violet-100/90 bg-white/80 p-12 text-center shadow-xs rounded-2xl">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-600 mb-4">
            <Inbox className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {statusTab === "pending"
              ? "You're all caught up."
              : `No ${statusTab} items found`}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
            {statusTab === "pending"
              ? "New AI recommendations will appear here when incoming emails are processed."
              : "Try switching filters or processing emails to see recommendations here."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onApprove={handleApprove}
              onEditAndApprove={handleEditAndApprove}
              onReject={handleReject}
              isProcessing={processingId === action.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
