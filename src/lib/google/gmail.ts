/**
 * gmail.ts — Server-side Gmail API integration for dispatching real email replies.
 *
 * Constructs RFC 2822 compliant email messages with In-Reply-To and References
 * headers to preserve native Gmail conversation threads.
 */

import { getValidGoogleAccessToken } from "./tokens";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SendGmailReplyParams {
  userId: string;
  inboundEventId: string;
  actionId: string;
  replyText: string;
}

export interface SendGmailReplyResult {
  messageId: string;
  threadId?: string;
}

/**
 * Sends an email reply via the Google Gmail REST API for an approved agent action.
 */
export async function sendGmailReply({
  userId,
  inboundEventId,
  actionId,
  replyText,
}: SendGmailReplyParams): Promise<SendGmailReplyResult> {
  if (!userId || !inboundEventId || !replyText.trim()) {
    throw new Error("[Gmail Reply] Invalid parameters: userId, inboundEventId, and non-empty replyText are required.");
  }

  // 1. Retrieve valid Google Access Token
  const accessToken = await getValidGoogleAccessToken(userId);

  // 2. Fetch original inbound event for email metadata and thread context
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event, error: fetchError } = await (supabase
    .from("inbound_events") as any)
    .select("id, sender_email, sender_name, subject, external_event_id, raw_payload, gmail_message_id, gmail_thread_id")
    .eq("id", inboundEventId)
    .single();

  if (fetchError || !event) {
    throw new Error(`[Gmail Reply] Inbound event '${inboundEventId}' not found.`);
  }

  const recipientEmail = event.sender_email;
  if (!recipientEmail) {
    throw new Error("[Gmail Reply] Cannot reply: recipient sender_email is missing from inbound event.");
  }

  const recipientDisplay = event.sender_name
    ? `${event.sender_name} <${recipientEmail}>`
    : recipientEmail;

  // Format subject line
  const origSubject = (event.subject || "").trim();
  const subject = /^re:/i.test(origSubject)
    ? origSubject
    : origSubject
    ? `Re: ${origSubject}`
    : "Re: Your message";

  // Extract thread and message IDs for thread preservation
  const rawPayload = (event.raw_payload as Record<string, unknown>) || {};
  const threadId =
    event.gmail_thread_id ||
    (typeof rawPayload.thread_id === "string" ? rawPayload.thread_id : null) ||
    (typeof rawPayload.threadId === "string" ? rawPayload.threadId : null) ||
    undefined;

  let messageIdHeader =
    event.gmail_message_id ||
    (typeof rawPayload["Header-Message-Id"] === "string" ? rawPayload["Header-Message-Id"] : null) ||
    (typeof rawPayload.message_id === "string" ? rawPayload.message_id : null) ||
    (typeof rawPayload.messageId === "string" ? rawPayload.messageId : null) ||
    event.external_event_id ||
    null;

  if (messageIdHeader && !messageIdHeader.startsWith("<")) {
    messageIdHeader = `<${messageIdHeader}>`;
  }

  // 3. Construct RFC 2822 Message Headers and Body
  const headers: string[] = [
    `To: ${recipientDisplay}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 7bit",
  ];

  if (messageIdHeader) {
    headers.push(`In-Reply-To: ${messageIdHeader}`);
    headers.push(`References: ${messageIdHeader}`);
  }

  const rawRfc2822 = `${headers.join("\r\n")}\r\n\r\n${replyText.trim()}`;

  // 4. Encode payload as URL-safe Base64 string
  const base64EncodedRaw = Buffer.from(rawRfc2822)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const requestBody: { raw: string; threadId?: string } = {
    raw: base64EncodedRaw,
  };

  if (threadId) {
    requestBody.threadId = threadId;
  }

  // 5. Dispatch via Gmail API
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Gmail Reply] Gmail API returned error:", errorText);
    throw new Error(`Gmail API error (${response.status}): ${errorText}`);
  }

  const responseData = await response.json();
  const sentMessageId: string = responseData.id;
  const sentThreadId: string | undefined = responseData.threadId;

  return {
    messageId: sentMessageId,
    threadId: sentThreadId,
  };
}
