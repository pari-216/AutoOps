/**
 * types.ts — Shared TypeScript types for the AutoOps AI agent.
 *
 * Keep this file free of any runtime dependencies so it can be
 * imported anywhere without side effects.
 */

// ── Classification ────────────────────────────────────────────────────────────

/**
 * The four categories the AI agent can assign to an inbound email.
 */
export type Classification =
  | "urgent"
  | "needs_reply"
  | "fyi"
  | "spam_like";

export const VALID_CLASSIFICATIONS: readonly Classification[] = [
  "urgent",
  "needs_reply",
  "fyi",
  "spam_like",
] as const;

// ── Agent I/O ─────────────────────────────────────────────────────────────────

/**
 * The sanitised email data handed to the AI agent.
 * Contains ONLY information needed for reasoning — no credentials,
 * no Supabase tokens, no internal IDs.
 */
export interface AgentInput {
  /** Sender's email address */
  sender_email: string | null;
  /** Sender's display name (if available) */
  sender_name: string | null;
  /** Email subject line */
  subject: string | null;
  /** Plain-text body */
  body_text: string | null;
  /** ISO 8601 timestamp when the email was received */
  received_at: string | null;
}

/**
 * The structured output produced by the AI agent after validation.
 */
export interface AgentOutput {
  /** One of the four classification categories */
  classification: Classification;
  /**
   * A draft reply when a reply is appropriate (urgent / needs_reply).
   * null for fyi and spam_like.
   */
  drafted_reply: string | null;
  /**
   * Confidence score between 0.00 and 1.00.
   * Represents the model's subjective certainty, not a calibrated probability.
   */
  confidence: number;
  /**
   * Short explanation of why the classification was chosen.
   * Maximum a few sentences — no invented details.
   */
  reasoning: string;
  /**
   * Maps classification to a suggested operational action for Phase 5.
   * Derived automatically from classification.
   */
  suggested_action: "reply" | "ignore";
}
