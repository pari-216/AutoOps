/**
 * normalize-email.ts
 *
 * Converts raw inbound payloads (from Zapier Gmail → Webhook)
 * into a canonical shape ready for insertion into inbound_events.
 *
 * Zapier field naming can vary between zap versions, so we accept
 * multiple common aliases for each logical field.
 */

export interface NormalizedEmail {
  /** External message ID (e.g. Gmail messageId). Used for dedup. */
  external_event_id: string | null;
  /** Sender email address */
  sender_email: string | null;
  /** Sender display name */
  sender_name: string | null;
  /** Email subject line */
  subject: string | null;
  /** Plain-text body */
  body_text: string | null;
  /** When the email was received by the mail server */
  received_at: string | null;
  /** Original untouched payload, stored for debugging */
  raw_payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick the first non-empty string value from a list of key aliases.
 */
function pick(
  payload: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
}

/**
 * Parse a sender string like "Jane Doe <jane@example.com>" into name + email.
 */
function parseSender(raw: string | null): {
  email: string | null;
  name: string | null;
} {
  if (!raw) return { email: null, name: null };

  // "Name <email>" format
  const angleMatch = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (angleMatch) {
    return {
      name: angleMatch[1].replace(/^["']|["']$/g, "").trim() || null,
      email: angleMatch[2].trim().toLowerCase(),
    };
  }

  // Plain email
  if (raw.includes("@")) {
    return { email: raw.trim().toLowerCase(), name: null };
  }

  return { email: null, name: raw.trim() || null };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Normalise a raw Zapier payload into a canonical NormalizedEmail.
 *
 * Zapier may send fields under different key names depending on which
 * Gmail trigger action was chosen. We handle all common variants.
 */
export function normalizeEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawPayload: Record<string, any>
): NormalizedEmail {
  // --- Message ID (dedup key) ---
  const external_event_id = pick(rawPayload, [
    "id",               // Zapier Gmail "New Email" trigger
    "messageId",
    "message_id",
    "email_id",
    "external_event_id", // direct / test payloads
  ]);

  // --- Sender (may be combined "From" or split fields) ---
  const rawFrom = pick(rawPayload, [
    "from",
    "From",
    "sender",
    "fromEmail",
    "from_email",
  ]);

  const { email: fromEmail, name: fromName } = parseSender(rawFrom);

  const sender_email =
    pick(rawPayload, ["senderEmail", "sender_email", "fromAddress"]) ??
    fromEmail;

  const sender_name =
    pick(rawPayload, ["senderName", "sender_name", "fromName", "from_name"]) ??
    fromName;

  // --- Subject ---
  const subject = pick(rawPayload, ["subject", "Subject"]);

  // --- Body ---
  const body_text = pick(rawPayload, [
    "bodyPlain",
    "body_plain",
    "body_text",
    "bodyText",
    "body",
    "snippet",
  ]);

  // --- Received timestamp ---
  const rawDate = pick(rawPayload, [
    "date",
    "Date",
    "internalDate",
    "received_at",
    "receivedAt",
    "timestamp",
  ]);

  let received_at: string | null = null;
  if (rawDate) {
    // Attempt to parse any ISO or RFC 2822 date string into ISO 8601
    const parsed = new Date(rawDate);
    received_at = isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return {
    external_event_id,
    sender_email,
    sender_name,
    subject,
    body_text,
    received_at,
    raw_payload: rawPayload,
  };
}
