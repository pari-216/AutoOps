/**
 * schema.ts — Zod validation schema for raw LLM output.
 *
 * The AI may return unexpected or malformed JSON. This schema
 * ensures every field is present, correctly typed, and within
 * valid ranges before the data is stored in the database.
 *
 * IMPORTANT: Do NOT blindly trust LLM output. Always validate here.
 */

import { z } from "zod";
import { VALID_CLASSIFICATIONS } from "./types";

// ---------------------------------------------------------------------------
// Raw AI output schema
// ---------------------------------------------------------------------------

/**
 * Schema for the raw JSON object returned by the LLM.
 * Field names match what the system prompt instructs the model to return.
 */
export const AgentOutputSchema = z.object({
  classification: z
    .enum(VALID_CLASSIFICATIONS as [string, ...string[]])
    .describe("One of: urgent, needs_reply, fyi, spam_like"),

  drafted_reply: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null)
    .describe("Draft reply text, or null if no reply is warranted"),

  confidence: z
    .number()
    .min(0, "Confidence must be >= 0")
    .max(1, "Confidence must be <= 1")
    .describe("Confidence score between 0.00 and 1.00"),

  reasoning: z
    .string()
    .min(1, "Reasoning must not be empty")
    .describe("Short explanation of the classification decision"),
});

export type RawAgentOutput = z.infer<typeof AgentOutputSchema>;

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

export interface ValidationSuccess {
  success: true;
  data: RawAgentOutput;
}

export interface ValidationFailure {
  success: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validate raw LLM JSON output against the AgentOutputSchema.
 * Returns a typed result — never throws.
 */
export function validateAgentOutput(raw: unknown): ValidationResult {
  const result = AgentOutputSchema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessages = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  return { success: false, error: `AI output validation failed: ${errorMessages}` };
}
