/**
 * dispatcher.ts — Central Outbound Execution Engine for AutoOps.
 *
 * Coordinates execution of human-approved AI actions across Gmail API,
 * Google Calendar API, and outbound Zapier webhooks. Enforces atomic
 * state machine safeguards to prevent double execution and logs audit trails.
 */

import { sendGmailReply } from "@/lib/google/gmail";
import { createCalendarEvent } from "@/lib/google/calendar";
import { dispatchToZapier } from "@/lib/webhooks/zapier-outbound";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ExecutionResult {
  success: boolean;
  actionId: string;
  executionStatus: "executed" | "failed";
  externalActionId?: string;
  error?: string;
}

/**
 * Executes a human-approved agent action.
 */
export async function executeApprovedAction(
  actionId: string,
  userId: string
): Promise<ExecutionResult> {
  const supabase = createAdminClient();

  // 1. Retrieve agent action with linked inbound event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: action, error: fetchError } = await (supabase
    .from("agent_actions") as any)
    .select(`
      id, user_id, event_id, classification, suggested_action, drafted_reply,
      status, execution_status,
      inbound_events (
        id, sender_email, sender_name, subject, body_text
      )
    `)
    .eq("id", actionId)
    .single();

  if (fetchError || !action) {
    throw new Error(`[Execution Engine] Action '${actionId}' not found.`);
  }

  if (action.user_id !== userId) {
    throw new Error("[Execution Engine] Unauthorized: Action belongs to another user.");
  }

  if (action.status === "rejected") {
    throw new Error("[Execution Engine] Safety constraint: Rejected actions cannot be executed.");
  }

  if (action.status !== "approved" && action.status !== "edited") {
    throw new Error(`[Execution Engine] Action status must be 'approved' or 'edited' (current: '${action.status}').`);
  }

  if (action.execution_status === "executed" || action.execution_status === "executing") {
    console.info(`[Execution Engine] Action '${actionId}' is already ${action.execution_status} — skipping.`);
    return {
      success: action.execution_status === "executed",
      actionId,
      executionStatus: action.execution_status,
      externalActionId: action.external_action_id,
    };
  }

  // 2. Atomic lock: Set execution_status to 'executing'
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: locked, error: lockError } = await (supabase
    .from("agent_actions") as any)
    .update({
      execution_status: "executing",
      updated_at: now,
    })
    .eq("id", actionId)
    .eq("user_id", userId)
    .in("execution_status", ["unexecuted", "failed"])
    .select("id")
    .single();

  if (lockError || !locked) {
    console.warn(`[Execution Engine] Concurrency lock failed for action '${actionId}'.`);
    return {
      success: false,
      actionId,
      executionStatus: "failed",
      error: "Concurrent execution lock failed.",
    };
  }

  const rawEvent = action.inbound_events;
  const event = Array.isArray(rawEvent) ? rawEvent[0] : rawEvent;

  let executionSuccess = false;
  let externalId: string | undefined;
  let executionErrorMessage: string | undefined;

  const replyText = action.drafted_reply || "";
  const suggestedAction = action.suggested_action || "reply";

  // 3. Dispatch based on suggested_action (Gmail Reply vs Calendar Event)
  if (suggestedAction === "schedule") {
    // ── CALENDAR EVENT CREATION ───────────────────────────────────────────
    await (supabase.from("activity_log") as any).insert({
      user_id: userId,
      agent_action_id: actionId,
      event_id: action.event_id,
      action_type: "calendar_event_started",
      before_data: { execution_status: "executing" },
    });

    try {
      const calResult = await createCalendarEvent({
        userId,
        actionId,
        title: event?.subject ? `Meeting: ${event.subject}` : "AutoOps Scheduled Event",
        description: replyText,
        attendees: event?.sender_email ? [event.sender_email] : undefined,
      });

      externalId = calResult.eventId;
      executionSuccess = true;

      await (supabase.from("activity_log") as any).insert({
        user_id: userId,
        agent_action_id: actionId,
        event_id: action.event_id,
        action_type: "calendar_event_created",
        after_data: {
          eventId: calResult.eventId,
          htmlLink: calResult.htmlLink,
        },
      });
    } catch (err) {
      executionErrorMessage = err instanceof Error ? err.message : "Calendar API execution failed";
      console.error("[Execution Engine] Calendar execution failed:", err);

      await (supabase.from("activity_log") as any).insert({
        user_id: userId,
        agent_action_id: actionId,
        event_id: action.event_id,
        action_type: "calendar_event_failed",
        after_data: { error: executionErrorMessage },
      });
    }
  } else {
    // ── GMAIL EMAIL REPLY (Default) ─────────────────────────────────────────
    await (supabase.from("activity_log") as any).insert({
      user_id: userId,
      agent_action_id: actionId,
      event_id: action.event_id,
      action_type: "gmail_reply_started",
      before_data: { execution_status: "executing" },
    });

    try {
      if (!action.event_id) {
        throw new Error("No linked inbound event found for email reply.");
      }

      const gmailResult = await sendGmailReply({
        userId,
        inboundEventId: action.event_id,
        actionId,
        replyText,
      });

      externalId = gmailResult.messageId;
      executionSuccess = true;

      await (supabase.from("activity_log") as any).insert({
        user_id: userId,
        agent_action_id: actionId,
        event_id: action.event_id,
        action_type: "gmail_reply_sent",
        after_data: {
          messageId: gmailResult.messageId,
          threadId: gmailResult.threadId,
          recipient: event?.sender_email,
        },
      });
    } catch (err) {
      executionErrorMessage = err instanceof Error ? err.message : "Gmail API execution failed";
      console.error("[Execution Engine] Gmail reply failed:", err);

      await (supabase.from("activity_log") as any).insert({
        user_id: userId,
        agent_action_id: actionId,
        event_id: action.event_id,
        action_type: "gmail_reply_failed",
        after_data: { error: executionErrorMessage },
      });
    }
  }

  // 4. Outbound Zapier Webhook Dispatch (Optional)
  if (process.env.ZAPIER_OUTBOUND_WEBHOOK_URL) {
    await (supabase.from("activity_log") as any).insert({
      user_id: userId,
      agent_action_id: actionId,
      event_id: action.event_id,
      action_type: "zapier_dispatch_started",
    });

    const zapResult = await dispatchToZapier({
      action_id: actionId,
      user_id: userId,
      action_type: suggestedAction,
      inbound_event_id: action.event_id,
      recipient: event?.sender_email,
      subject: event?.subject,
      body: replyText,
      timestamp: new Date().toISOString(),
    });

    if (zapResult.ok) {
      await (supabase.from("activity_log") as any).insert({
        user_id: userId,
        agent_action_id: actionId,
        event_id: action.event_id,
        action_type: "zapier_dispatch_succeeded",
        after_data: { status: zapResult.status },
      });
    } else {
      await (supabase.from("activity_log") as any).insert({
        user_id: userId,
        agent_action_id: actionId,
        event_id: action.event_id,
        action_type: "zapier_dispatch_failed",
        after_data: { error: zapResult.error },
      });
    }
  }

  // 5. Update final agent_actions execution state
  //
  // IMPORTANT: `status` tracks the HUMAN DECISION (approved / edited / rejected).
  // Do NOT overwrite it with an execution-lifecycle value.
  // `execution_status` tracks the execution pipeline outcome (executing → executed / failed).
  // Keeping them separate means an approved action stays in the "Approved" tab regardless
  // of whether execution succeeded or failed.
  const finalStatus = action.status; // preserve 'approved' or 'edited' — human decision unchanged
  const finalExecutionStatus = executionSuccess ? "executed" : "failed";

  await (supabase.from("agent_actions") as any)
    .update({
      status: finalStatus,
      execution_status: finalExecutionStatus,
      executed_at: executionSuccess ? new Date().toISOString() : null,
      execution_error: executionErrorMessage || null,
      external_action_id: externalId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  return {
    success: executionSuccess,
    actionId,
    executionStatus: finalExecutionStatus,
    externalActionId: externalId,
    error: executionErrorMessage,
  };
}
