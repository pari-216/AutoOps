/**
 * process-event.ts — AI processing orchestrator for AutoOps.
 *
 * processInboundEvent(eventId, userId) is the single entry point
 * for the AI pipeline. It:
 *   1. Loads the inbound_events row
 *   2. Guards against duplicate processing (dedup)
 *   3. Builds a safe AgentInput (no credentials)
 *   4. Calls the AI agent
 *   5. Validates the output (via Zod inside callAgent)
 *   6. Stores the agent_action row
 *   7. Writes an activity_log entry
 *   8. On failure: logs to activity_log, never deletes the email
 *
 * IMPORTANT:
 * - This function should be called after inbound_events insert succeeds.
 * - All errors are caught — callers never need to handle them to preserve
 *   the parent 200 response to Zapier.
 * - The email is NEVER deleted on AI failure.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { callAgent } from "./agent";
import type { AgentInput } from "./types";

// ── Types for database rows ────────────────────────────────────────────────

interface InboundEventRow {
  id: string;
  user_id: string;
  sender_email: string | null;
  sender_name: string | null;
  subject: string | null;
  body_text: string | null;
  received_at: string | null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Process an inbound event through the AI agent pipeline.
 *
 * @param eventId - The UUID of the inbound_events row to process.
 * @param userId  - The owner's UUID (used for all DB writes).
 *
 * This function NEVER throws — all errors are logged and swallowed
 * so the parent webhook 200 response is preserved.
 */
export async function processInboundEvent(
  eventId: string,
  userId: string
): Promise<void> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("[AutoOps processEvent] Could not create admin client:", err);
    return;
  }

  // ── 1. Load the inbound event ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventData, error: eventLoadError } = await (supabase
    .from("inbound_events") as any)
    .select("id, user_id, sender_email, sender_name, subject, body_text, received_at")
    .eq("id", eventId)
    .eq("user_id", userId)
    .single() as { data: InboundEventRow | null; error: unknown };

  if (eventLoadError || !eventData) {
    console.error(
      `[AutoOps processEvent] Could not load inbound_event ${eventId}:`,
      eventLoadError
    );
    return;
  }

  // ── 2. Dedup guard — check if already processed ───────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: existingCount } = await (supabase
    .from("agent_actions") as any)
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId) as { count: number | null };

  if (existingCount && existingCount > 0) {
    console.info(
      `[AutoOps processEvent] Event ${eventId} already has an agent_action — skipping.`
    );
    return;
  }

  // ── 3. Build sanitised AgentInput (no credentials) ───────────────────────
  const agentInput: AgentInput = {
    sender_email: eventData.sender_email,
    sender_name: eventData.sender_name,
    subject: eventData.subject,
    body_text: eventData.body_text,
    received_at: eventData.received_at,
  };

  // ── 4 & 5. Call the AI agent (validates output internally with Zod) ───────
  let agentOutput;
  try {
    agentOutput = await callAgent(agentInput);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[AutoOps processEvent] AI agent call failed for event ${eventId}:`, message);

    // Write failure to activity_log so it's visible in the dashboard
    await writeActivityLog(supabase, userId, eventId, "agent_error", {
      error: message.slice(0, 500),
      event_id: eventId,
    });
    return;
  }

  // ── 6. Store agent_action ─────────────────────────────────────────────────
  const actionRow = {
    user_id: userId,
    event_id: eventId,
    classification: agentOutput.classification,
    suggested_action: agentOutput.suggested_action,
    drafted_reply: agentOutput.drafted_reply,
    confidence: agentOutput.confidence,
    reason: agentOutput.reasoning,
    status: "pending",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: insertedAction, error: insertError } = await (supabase
    .from("agent_actions") as any)
    .insert(actionRow)
    .select("id")
    .single() as { data: { id: string } | null; error: { code: string; message: string } | null };

  if (insertError) {
    // code 23505 = unique_violation → race condition, another process already inserted
    if (insertError.code === "23505") {
      console.info(
        `[AutoOps processEvent] agent_action for event ${eventId} already exists (race condition) — skipping.`
      );
      return;
    }

    console.error(
      `[AutoOps processEvent] Failed to insert agent_action for event ${eventId}:`,
      insertError
    );

    await writeActivityLog(supabase, userId, eventId, "agent_error", {
      error: `DB insert failed: ${insertError.message}`,
    });
    return;
  }

  // ── 7. Write activity_log entry ───────────────────────────────────────────
  await writeActivityLog(supabase, userId, eventId, "agent_processed", {
    classification: agentOutput.classification,
    confidence: agentOutput.confidence,
    agent_action_id: insertedAction?.id ?? null,
  });

  console.info(
    `[AutoOps processEvent] ✓ Event ${eventId} processed → ` +
      `${agentOutput.classification} (confidence=${agentOutput.confidence})`
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function writeActivityLog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  eventId: string,
  actionType: string,
  afterData: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    user_id: userId,
    event_id: eventId,
    action_type: actionType,
    after_data: afterData,
  });

  if (error) {
    // Non-fatal — log to console only
    console.warn(
      `[AutoOps processEvent] Failed to write activity_log (${actionType}):`,
      error
    );
  }
}
