/**
 * zapier-outbound.ts — Server-side helper for dispatching outbound Zapier webhooks.
 *
 * Sends sanitized, structured action data to Zapier for external workflow automation.
 * NEVER exposes tokens, secrets, or internal credentials in the payload.
 */

export interface ZapierOutboundPayload {
  action_id: string;
  user_id: string;
  action_type: string;
  inbound_event_id?: string | null;
  recipient?: string | null;
  subject?: string | null;
  body?: string | null;
  calendar_data?: {
    title?: string;
    start?: string;
    end?: string;
    attendees?: string[];
  } | null;
  timestamp: string;
}

export interface ZapierDispatchResult {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
}

/**
 * Dispatches an outbound webhook payload to the configured Zapier webhook URL.
 */
export async function dispatchToZapier(
  payload: ZapierOutboundPayload
): Promise<ZapierDispatchResult> {
  const webhookUrl = process.env.ZAPIER_OUTBOUND_WEBHOOK_URL;

  if (!webhookUrl || !webhookUrl.trim()) {
    return { ok: true, skipped: true };
  }

  const outboundSecret = process.env.ZAPIER_OUTBOUND_WEBHOOK_SECRET;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "AutoOps-Outbound-Webhook/1.0",
  };

  if (outboundSecret && outboundSecret.trim()) {
    headers["x-autoops-outbound-secret"] = outboundSecret.trim();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Zapier Outbound] Webhook returned status ${response.status}:`, errText);
      return {
        ok: false,
        status: response.status,
        error: `Zapier webhook returned status ${response.status}`,
      };
    }

    return { ok: true, status: response.status };
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMessage = err instanceof Error ? err.message : "Network error";
    console.error("[Zapier Outbound] Failed to send outbound webhook:", errorMessage);
    return {
      ok: false,
      error: errorMessage,
    };
  }
}
