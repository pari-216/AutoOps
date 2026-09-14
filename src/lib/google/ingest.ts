/**
 * ingest.ts — Server-side Direct Gmail API Ingestion & Parsing Engine.
 *
 * Ingests new Gmail messages for a connected AutoOps user, parses RFC 822 / MIME
 * headers and bodies, inserts records into `inbound_events` with strict deduplication,
 * and triggers the Phase 4 AI Reasoning Agent.
 */

import { getValidGoogleAccessToken } from "./tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { processInboundEvent } from "@/lib/ai/process-event";

export interface IngestResult {
  found: number;
  inserted: number;
  skipped: number;
  errors: number;
  retriedProcessed?: number;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType: string;
  body?: {
    data?: string;
  };
  parts?: GmailPart[];
}

/**
 * Decodes URL-safe Base64 strings from Gmail API payload bodies.
 */
function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/**
 * Converts HTML body content to clean plain text.
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

/**
 * Parses sender header into email and optional display name.
 * e.g., "Sarah Connor <sarah@example.com>" -> { name: "Sarah Connor", email: "sarah@example.com" }
 */
export function parseSenderHeader(fromHeader: string): { email: string | null; name: string | null } {
  if (!fromHeader || typeof fromHeader !== "string") {
    return { email: null, name: null };
  }

  const match = fromHeader.match(/^(.*?)\s*<([^>]+)>/);
  if (match) {
    const name = match[1].replace(/^["']|["']$/g, "").trim();
    const email = match[2].trim();
    return { email: email || null, name: name || null };
  }

  const clean = fromHeader.trim();
  if (clean.includes("@")) {
    return { email: clean, name: null };
  }

  return { email: null, name: null };
}

/**
 * Recursively extracts plain text or converted HTML body from Gmail message parts.
 */
export function extractMessageBody(part: GmailPart): string {
  if (!part) return "";

  // 1. Check direct part body
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  // 2. Check multipart sub-parts recursively
  if (part.parts && Array.isArray(part.parts)) {
    // Prefer text/plain first
    for (const subPart of part.parts) {
      if (subPart.mimeType === "text/plain" && subPart.body?.data) {
        return decodeBase64Url(subPart.body.data);
      }
    }
    // Fall back to text/html
    for (const subPart of part.parts) {
      if (subPart.mimeType === "text/html" && subPart.body?.data) {
        const html = decodeBase64Url(subPart.body.data);
        return stripHtmlTags(html);
      }
    }
    // Recurse deeper for nested multipart/alternative
    for (const subPart of part.parts) {
      const nested = extractMessageBody(subPart);
      if (nested) return nested;
    }
  }

  // 3. Direct HTML fallback
  if (part.mimeType === "text/html" && part.body?.data) {
    return stripHtmlTags(decodeBase64Url(part.body.data));
  }

  return "";
}

/**
 * Ingests unread/new Gmail messages for a single connected AutoOps user.
 */
export async function ingestGmailForUser(userId: string): Promise<IngestResult> {
  const result: IngestResult = { found: 0, inserted: 0, skipped: 0, errors: 0 };

  if (!userId) {
    throw new Error("[Gmail Ingest] userId is required.");
  }

  // 1. Obtain valid access token for the user
  const accessToken = await getValidGoogleAccessToken(userId);
  const supabase = createAdminClient();

  // 2. Fetch user's connected account metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase
    .from("connected_accounts") as any)
    .select("id, last_synced_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .eq("status", "active")
    .single();

  if (!account) {
    throw new Error(`[Gmail Ingest] Active Google account not found for user ${userId}`);
  }

  // 3. Query Gmail API for unread messages
  // We query unread messages (q=is:unread) to fetch unhandled operational emails
  const query = "is:unread";
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=15`;

  const listResponse = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listResponse.ok) {
    const errText = await listResponse.text();
    console.error(`[Gmail Ingest] List messages failed for user ${userId}:`, errText);
    throw new Error(`Gmail API error (${listResponse.status}): ${errText}`);
  }

  const listData = await listResponse.json();
  const messages: { id: string; threadId: string }[] = listData.messages || [];

  result.found = messages.length;

  if (messages.length === 0) {
    // Update last_synced_at timestamp even if no new emails
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("connected_accounts") as any)
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", account.id);

    return result;
  }

  // 4. Fetch details and ingest each message
  for (const item of messages) {
    try {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`;
      const detailResponse = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!detailResponse.ok) {
        result.errors++;
        continue;
      }

      const msgData = await detailResponse.json();
      const headers: GmailHeader[] = msgData.payload?.headers || [];

      const getHeader = (name: string): string => {
        const h = headers.find((header) => header.name.toLowerCase() === name.toLowerCase());
        return h ? h.value : "";
      };

      const fromHeader = getHeader("From");
      const { email: senderEmail, name: senderName } = parseSenderHeader(fromHeader);
      const subject = getHeader("Subject") || "(no subject)";
      const dateHeader = getHeader("Date");
      const messageIdHeader = getHeader("Message-ID") || item.id;

      const receivedAt = dateHeader && !isNaN(Date.parse(dateHeader))
        ? new Date(dateHeader).toISOString()
        : new Date().toISOString();

      const bodyText = extractMessageBody(msgData.payload) || msgData.snippet || "";

      // Construct event row bound strictly to this user
      const eventRow = {
        user_id: userId,
        source: "gmail",
        external_event_id: item.id,
        sender_email: senderEmail,
        sender_name: senderName,
        subject,
        body_text: bodyText,
        received_at: receivedAt,
        gmail_message_id: messageIdHeader,
        gmail_thread_id: item.threadId || item.id,
        raw_payload: {
          id: item.id,
          threadId: item.threadId,
          snippet: msgData.snippet,
          "Header-From": fromHeader,
          "Header-Subject": subject,
          "Header-Message-Id": messageIdHeader,
        },
      };

      // 5. Insert into inbound_events (with dedup ON CONFLICT DO NOTHING)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: insertedEvent, error: insertError } = await (supabase
        .from("inbound_events") as any)
        .insert(eventRow)
        .select("id")
        .single();

      if (insertError) {
        // Code 23505 = duplicate delivery (idx_inbound_events_dedup)
        if (insertError.code === "23505") {
          result.skipped++;
        } else {
          console.error(`[Gmail Ingest] Error inserting event for message ${item.id}:`, insertError);
          result.errors++;
        }
        continue;
      }

      const eventId = insertedEvent?.id;
      if (eventId) {
        result.inserted++;

        // Record activity log entry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("activity_log") as any).insert({
          user_id: userId,
          event_id: eventId,
          action_type: "email_received",
          after_data: {
            sender_email: senderEmail,
            subject,
            source: "gmail",
          },
        });

        // Trigger Phase 4 AI Agent (fire-and-forget)
        processInboundEvent(eventId, userId).catch((err) => {
          console.error(`[Gmail Ingest] AI Agent processing failed for event ${eventId}:`, err);
        });
      }
    } catch (err) {
      console.error(`[Gmail Ingest] Error ingesting message ${item.id}:`, err);
      result.errors++;
    }
  }

  // 6. Update last_synced_at timestamp on connected account
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("connected_accounts") as any)
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", account.id);

  // 7. Safe retry for existing unprocessed inbound events (batch limit of 15)
  try {
    const retried = await processUnprocessedEventsForUser(userId, 15);
    result.retriedProcessed = retried;
  } catch (retryErr) {
    console.error(`[Gmail Ingest] Retry unprocessed events error for user ${userId}:`, retryErr);
  }

  return result;
}

/**
 * Scans for inbound_events belonging to the user that do not yet have an agent_action,
 * and processes them through the AI pipeline.
 */
export async function processUnprocessedEventsForUser(
  userId: string,
  limit = 15
): Promise<number> {
  const supabase = createAdminClient();

  // 1. Get IDs of events that already have an agent_action (any status)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: actions, error: actionsError } = await (supabase
    .from("agent_actions") as any)
    .select("event_id")
    .eq("user_id", userId);

  if (actionsError) {
    console.error(`[AI Ingest Retry] Error fetching agent_actions for user ${userId}:`, actionsError);
    return 0;
  }

  const processedEventIds = new Set<string>(
    (actions || []).map((a: { event_id: string }) => a.event_id).filter(Boolean)
  );

  // 2. Fetch recent inbound_events for this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events, error: eventsError } = await (supabase
    .from("inbound_events") as any)
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (eventsError || !events) {
    console.error(`[AI Ingest Retry] Error fetching inbound_events for user ${userId}:`, eventsError);
    return 0;
  }

  const unprocessed = (events as { id: string }[])
    .filter((e) => !processedEventIds.has(e.id))
    .slice(0, limit);

  let processedCount = 0;
  for (const event of unprocessed) {
    try {
      await processInboundEvent(event.id, userId);
      processedCount++;
    } catch (err) {
      console.error(`[AI Ingest Retry] Failed to process event ${event.id}:`, err);
    }
  }

  return processedCount;
}
