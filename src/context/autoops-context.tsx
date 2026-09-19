"use client";

import React, { createContext, useContext, useState } from "react";

export interface ApprovalItem {
  id: string;
  subject: string;
  from: string;
  senderName: string;
  time: string;
  intent: string;
  confidence: number;
  suggestion: string;
  details: string;
  draftText: string;
}

export interface ActivityLog {
  id: string;
  type: "approved" | "rejected" | "received" | "system";
  title: string;
  description: string;
  timestamp: string;
  actor: string;
}

export interface ToastState {
  id: string;
  message: string;
  type: "success" | "info" | "error";
}

interface AutoOpsContextType {
  pendingItems: ApprovalItem[];
  approvedItems: (ApprovalItem & { approvedAt: string })[];
  rejectedItems: (ApprovalItem & { rejectedAt: string; reason?: string })[];
  activityLogs: ActivityLog[];
  gmailConnected: boolean;
  isSimulating: boolean;
  toasts: ToastState[];
  settings: {
    responseTone: boolean;
    suggestBeforeSending: boolean;
    contextualLearning: boolean;
    approvalRequests: boolean;
    dailyDigest: boolean;
    productUpdates: boolean;
  };
  approveItem: (id: string) => void;
  rejectItem: (id: string, reason?: string) => void;
  simulateIncomingEmail: () => void;
  connectGmail: () => void;
  updateSetting: (key: string, value: boolean) => void;
  removeToast: (id: string) => void;
  refreshPendingCount: () => Promise<void>;
}

import { useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const initialPending: ApprovalItem[] = [];
const initialLogs: ActivityLog[] = [];

const AutoOpsContext = createContext<AutoOpsContextType | undefined>(undefined);

export function AutoOpsProvider({ children }: { children: React.ReactNode }) {
  const [pendingItems, setPendingItems] = useState<ApprovalItem[]>(initialPending);
  const [approvedItems, setApprovedItems] = useState<
    (ApprovalItem & { approvedAt: string })[]
  >([]);
  const [rejectedItems, setRejectedItems] = useState<
    (ApprovalItem & { rejectedAt: string; reason?: string })[]
  >([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialLogs);
  const [gmailConnected, setGmailConnected] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const refreshPendingCount = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("agent_actions")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (data && Array.isArray(data)) {
        setPendingItems(
          data.map((item: { id: string }) => ({
            id: item.id,
            subject: "",
            from: "",
            senderName: "",
            time: "",
            intent: "",
            confidence: 0,
            suggestion: "",
            details: "",
            draftText: "",
          }))
        );
      }
    } catch {
      // Non-blocking
    }
  }, []);

  // Sync real pending items count from Supabase on mount & subscribe to realtime changes
  useEffect(() => {
    refreshPendingCount();

    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const channel = supabase
        .channel("realtime_agent_actions_context")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "agent_actions",
          },
          () => {
            refreshPendingCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Non-blocking
    }
  }, [refreshPendingCount]);
  const [settings, setSettings] = useState({
    responseTone: true,
    suggestBeforeSending: true,
    contextualLearning: false,
    approvalRequests: true,
    dailyDigest: true,
    productUpdates: false,
  });

  const addToast = (message: string, type: "success" | "info" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const approveItem = (id: string) => {
    const item = pendingItems.find((p) => p.id === id);
    if (!item) return;

    const nowStr = "Just now";
    setPendingItems((prev) => prev.filter((p) => p.id !== id));
    setApprovedItems((prev) => [{ ...item, approvedAt: nowStr }, ...prev]);
    setActivityLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        type: "approved",
        title: `Approved Action: ${item.intent}`,
        description: `Executed suggestion: "${item.suggestion}" for ${item.from}`,
        timestamp: nowStr,
        actor: "You (Human Admin)",
      },
      ...prev,
    ]);

    addToast(`Action Approved: "${item.intent}" executed successfully!`, "success");
  };

  const rejectItem = (id: string, reason?: string) => {
    const item = pendingItems.find((p) => p.id === id);
    if (!item) return;

    const nowStr = "Just now";
    setPendingItems((prev) => prev.filter((p) => p.id !== id));
    setRejectedItems((prev) => [{ ...item, rejectedAt: nowStr, reason }, ...prev]);
    setActivityLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        type: "rejected",
        title: `Declined Suggestion: ${item.intent}`,
        description: `Suggestion declined for ${item.from}. AI updated learning model.`,
        timestamp: nowStr,
        actor: "You (Human Admin)",
      },
      ...prev,
    ]);

    addToast(`Suggestion declined. Feedback recorded for AI learning.`, "info");
  };

  const simulateIncomingEmail = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    addToast("Simulating incoming operational email...", "info");

    setTimeout(() => {
      const simulatedSamples = [
        {
          subject: "Urgent Client Onboarding Form",
          from: "david@enterprise.com",
          senderName: "David Miller",
          intent: "Send Onboarding Kit",
          confidence: 96,
          suggestion: "Send Welcome Onboarding PDF & Schedule Kickoff Meeting",
          details: "Client requested standard Enterprise Tier onboarding link.",
          draftText:
            "Hi David,\n\nWelcome aboard! Here is your Enterprise Onboarding Kit. Let us know your preferred kickoff time.\n\nBest,\nOperations",
        },
        {
          subject: "Contract Revision Approval Required",
          from: "legal@globaltech.org",
          senderName: "GlobalTech Legal",
          intent: "Review Contract Draft",
          confidence: 94,
          suggestion: "Queue NDA amendment draft for review in dashboard",
          details: "Updated Clause 4.2 regarding data privacy compliance.",
          draftText:
            "Hi Legal Team,\n\nWe have reviewed Clause 4.2 and accepted the amendment. Proceeding with execution.\n\nRegards,",
        },
        {
          subject: "Monthly Service Renewal Inquiry",
          from: "alex@designstudio.co",
          senderName: "Alex Rivera",
          intent: "Renew Subscription",
          confidence: 97,
          suggestion: "Generate Annual Renewal Link & Apply 10% Loyalty Discount",
          details: "Account in good standing for 24 months.",
          draftText:
            "Hi Alex,\n\nThank you for being a loyal partner! Attached is your annual renewal with an automatic 10% discount applied.\n\nCheers!",
        },
      ];

      const sample =
        simulatedSamples[Math.floor(Math.random() * simulatedSamples.length)];
      const newItem: ApprovalItem = {
        id: `sim-${Date.now()}`,
        subject: sample.subject,
        from: sample.from,
        senderName: sample.senderName,
        time: "Just now",
        intent: sample.intent,
        confidence: sample.confidence,
        suggestion: sample.suggestion,
        details: sample.details,
        draftText: sample.draftText,
      };

      setPendingItems((prev) => [newItem, ...prev]);
      setActivityLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          type: "received",
          title: "Incoming Operational Email Processed",
          description: `AI Agent drafted response for "${sample.subject}" (${sample.confidence}% confidence)`,
          timestamp: "Just now",
          actor: "AutoOps AI",
        },
        ...prev,
      ]);

      setIsSimulating(false);
      addToast(`New AI Suggestion queued for review: "${sample.intent}"`, "success");
    }, 1200);
  };

  const connectGmail = () => {
    setGmailConnected((prev) => {
      const next = !prev;
      if (next) {
        addToast("Gmail connected successfully! Monitoring active.", "success");
      } else {
        addToast("Gmail disconnected.", "info");
      }
      return next;
    });
  };

  const updateSetting = (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    addToast("Preference updated.", "info");
  };

  return (
    <AutoOpsContext.Provider
      value={{
        pendingItems,
        approvedItems,
        rejectedItems,
        activityLogs,
        gmailConnected,
        isSimulating,
        toasts,
        settings,
        approveItem,
        rejectItem,
        simulateIncomingEmail,
        connectGmail,
        updateSetting,
        removeToast,
        refreshPendingCount,
      }}
    >
      {children}
    </AutoOpsContext.Provider>
  );
}

export function useAutoOps() {
  const context = useContext(AutoOpsContext);
  if (!context) {
    throw new Error("useAutoOps must be used within an AutoOpsProvider");
  }
  return context;
}
