/**
 * POST /api/webhooks/inbound
 *
 * Receives operational emails forwarded by Zapier (Gmail → Zapier → here).
 *
 * Security model
 * ──────────────
 * • The request must carry the header:
 *     x-autoops-webhook-secret: <AUTOOPS_WEBHOOK_SECRET>
 *   This is a shared secret that Zapier sends in every request.
 * • user_id is NEVER accepted from the incoming payload.
 *   It is read exclusively from AUTOOPS_WEBHOOK_USER_ID (server env var).
 * • Inserts use the service-role Supabase client so that the webhook
 *   server can write on behalf of the configured user while RLS still
 *   protects all normal read/write paths.
 *
 * Deduplication
 * ─────────────
 * The insert uses ON CONFLICT DO NOTHING backed by the partial unique index
 * idx_inbound_events_dedup (user_id, source, external_event_id).
 * If Zapier sends the same message twice, the second attempt is silently
 * discarded and a 200 is still returned so Zapier does not retry.
 *
 * Accepted payload fields (all optional except as noted):
 * {
 *   // Dedup key — accepted under any of these names:
 *   "id" / "messageId" / "message_id" / "email_id" / "external_event_id"
 *
 *   // Sender — accepted as combined "from" string or split fields:
 *   "from" / "sender" / "senderEmail" / "sender_email"
 *   "senderName" / "sender_name"
 *
 *   "subject"                     // Email subject
 *   "bodyPlain" / "body" / "body_text" / "snippet"  // Plain-text body
 *   "date" / "received_at"        // Timestamp (ISO 8601 or RFC 2822)
 *   "source"                      // Optional override, defaults to "gmail"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/webhooks/normalize-email";
import { processInboundEvent } from "@/lib/ai/process-event";

// ---------------------------------------------------------------------------
// Environment variable helpers
// ---------------------------------------------------------------------------

function getWebhookSecret(): string | undefined {
  return process.env.AUTOOPS_WEBHOOK_SECRET;
}

function getWebhookUserId(): string | undefined {
  return process.env.AUTOOPS_WEBHOOK_USER_ID;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Secret authentication ─────────────────────────────────────────────
  const configuredSecret = getWebhookSecret();

  if (!configuredSecret) {
    console.error(
      "[AutoOps webhook] AUTOOPS_WEBHOOK_SECRET is not set — refusing all requests."
    );
    return NextResponse.json(
      { error: "Webhook is not configured. Set AUTOOPS_WEBHOOK_SECRET on the server." },
      { status: 503 }
    );
  }

  const incomingSecret = req.headers.get("x-autoops-webhook-secret");

  if (!incomingSecret || incomingSecret !== configuredSecret) {
    console.warn("[AutoOps webhook] Rejected request: invalid secret.");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── 2. Resolve server-side user_id ───────────────────────────────────────
  const userId = getWebhookUserId();

  if (!userId) {
    console.error(
      "[AutoOps webhook] AUTOOPS_WEBHOOK_USER_ID is not set — cannot determine target user."
    );
    return NextResponse.json(
      { error: "Server misconfiguration: target user not set. Set AUTOOPS_WEBHOOK_USER_ID on the server." },
      { status: 503 }
    );
  }

  // ── 3. Parse & validate payload ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawPayload: Record<string, any>;

  try {
    rawPayload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (typeof rawPayload !== "object" || rawPayload === null || Array.isArray(rawPayload)) {
    return NextResponse.json(
      { error: "Payload must be a JSON object." },
      { status: 400 }
    );
  }

  // ── 4. Normalize email fields ─────────────────────────────────────────────
  // normalizeEmail handles many Zapier field aliases.
  // We also accept direct field names (external_event_id, sender_email, etc.)
  // by patching them through the raw payload before normalising.
  const normalized = normalizeEmail(rawPayload);

  // Accept source override from the payload (e.g. "gmail", "outlook").
  const source =
    typeof rawPayload.source === "string" && rawPayload.source.trim()
      ? rawPayload.source.trim()
      : "gmail";

  // ── 5. Initialise the admin client (service-role) ─────────────────────────
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("[AutoOps webhook] Failed to initialise admin client:", err);
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: database client could not be initialised. " +
          "Ensure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are set on the server.",
      },
      { status: 503 }
    );
  }

  // ── 6. Insert into inbound_events (with dedup) ───────────────────────────
  const eventRow = {
    user_id: userId,
    source,
    external_event_id: normalized.external_event_id,
    sender_email: normalized.sender_email,
    sender_name: normalized.sender_name,
    subject: normalized.subject,
    body_text: normalized.body_text,
    received_at: normalized.received_at,
    raw_payload: normalized.raw_payload,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: insertedEvent, error: eventError } = await (supabase
    .from("inbound_events") as any)
    .insert(eventRow)
    .select("id")
    .single() as { data: { id: string } | null; error: { code: string; message: string } | null };

  if (eventError) {
    // Postgres error code 23505 = unique_violation → duplicate delivery
    if (eventError.code === "23505") {
      console.info(
        `[AutoOps webhook] Duplicate event ignored: external_event_id=${normalized.external_event_id}`
      );
      return NextResponse.json(
        { ok: true, duplicate: true },
        { status: 200 }
      );
    }

    console.error("[AutoOps webhook] Failed to insert inbound_event:", eventError);
    return NextResponse.json(
      { error: "Database error while storing event.", detail: eventError.message },
      { status: 500 }
    );
  }

  const eventId = insertedEvent?.id ?? null;

  // ── 7. Append activity_log entry ─────────────────────────────────────────
  if (eventId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: logError } = await (supabase.from("activity_log") as any).insert({
      user_id: userId,
      event_id: eventId,
      action_type: "email_received",
      after_data: {
        sender_email: normalized.sender_email,
        subject: normalized.subject,
        source,
      },
    });

    if (logError) {
      // Non-fatal — the event is already persisted. Log and continue.
      console.warn(
        "[AutoOps webhook] Failed to write activity_log entry:",
        logError
      );
    }
  }

  // ── 8. Trigger AI processing (fire-and-forget) ───────────────────────────
  // AI processing is intentionally NOT awaited. This ensures:
  //   • Zapier receives a fast 200 immediately after email storage.
  //   • A temporary AI failure never causes Zapier to retry ingestion.
  //   • The inbound email is always preserved regardless of AI outcome.
  // Errors are caught inside processInboundEvent and written to activity_log.
  if (eventId) {
    processInboundEvent(eventId, userId).catch((err) => {
      console.error(
        `[AutoOps webhook] Unhandled error in processInboundEvent for ${eventId}:`,
        err
      );
    });
  }

  // ── 9. Return success to Zapier ───────────────────────────────────────────
  console.info(
    `[AutoOps webhook] Ingested event id=${eventId} from=${normalized.sender_email} subject="${normalized.subject}" — AI processing started.`
  );

  return NextResponse.json(
    {
      ok: true,
      event_id: eventId,
      sender_email: normalized.sender_email,
      subject: normalized.subject,
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Reject all other HTTP methods
// ---------------------------------------------------------------------------

export function GET(): NextResponse {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
