/**
 * agent.ts — Provider-isolated AI agent for AutoOps.
 *
 * This file is the ONLY place where the Groq API is called.
 * To swap providers, only this file needs to change.
 *
 * SECURITY:
 * - GROQ_API_KEY is read server-side only — never NEXT_PUBLIC_*.
 * - The key is never logged.
 * - Raw email bodies are never logged at info level.
 *
 * Provider: Groq (llama-3.1-8b-instant)
 * Structured output: JSON mode (response_format: { type: "json_object" })
 */

import { Groq } from "groq-sdk";
import { AgentInput, AgentOutput, Classification } from "./types";
import { validateAgentOutput } from "./schema";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an operations assistant for a small business. Your job is to analyze incoming operational emails and prepare safe, useful recommendations for a human operator.

ROLE:
You do NOT send emails, take actions, or make commitments on behalf of the business.
You prepare recommendations. A human operator will review and approve before anything happens.

CLASSIFICATION RULES:
Classify every email into EXACTLY one of these four categories:

- urgent: Requires prompt human attention. Clear indicators: production outage, payment failure, deadline today, critical client issue, legal/security matter.
- needs_reply: Requires a response but not necessarily urgent. Examples: client questions, meeting requests, project updates needing confirmation, information requests.
- fyi: Informational only. No response required. Examples: newsletters, status notifications, automated reports, confirmations that need no action.
- spam_like: Clearly promotional, unsolicited, suspicious, or irrelevant content.

DECISION GUIDANCE:
- If uncertain between urgent and needs_reply, prefer needs_reply UNLESS the email clearly signals urgency (explicit words like "urgent", "emergency", "ASAP", "production is down", "deadline today").
- Do NOT assume an email is safe merely because it sounds professional.
- Do NOT invent details not present in the email.

DRAFT REPLY RULES:
- Generate a drafted_reply for: urgent (when a reply is appropriate) and needs_reply.
- Set drafted_reply to null for: fyi and spam_like.
- Drafted replies must be: professional, concise, directly addressing the email content.
- Do NOT make commitments to dates, meetings, refunds, payments, or actions unless the context explicitly supports them.
- Do NOT claim actions have already been taken.
- Do NOT hallucinate facts about the business, the sender, or prior interactions.

CONFIDENCE SCORING:
Return a confidence score between 0.00 and 1.00:
- 0.90–1.00: Very clear classification with no ambiguity.
- 0.75–0.89: Strong classification with minor uncertainty.
- 0.50–0.74: Some ambiguity in classification.
- Below 0.50: Highly uncertain.
This is an estimate, not a mathematically calibrated probability.

OUTPUT FORMAT:
You MUST return valid JSON matching this exact structure:
{
  "classification": "<urgent|needs_reply|fyi|spam_like>",
  "drafted_reply": "<string or null>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<concise explanation, 1-3 sentences>"
}

Do not include any text outside the JSON object.`;

// ---------------------------------------------------------------------------
// Provider call
// ---------------------------------------------------------------------------

function getGroqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "[AutoOps AI] GROQ_API_KEY is not set. " +
        "Add it to .env.local (server-only, never NEXT_PUBLIC_). " +
        "Configure the same variable in your Vercel project settings."
    );
  }
  return key;
}

/**
 * Build the user message from the sanitised email input.
 * Only includes information relevant for classification — no credentials.
 */
function buildUserMessage(input: AgentInput): string {
  const lines: string[] = ["INCOMING EMAIL:"];

  if (input.sender_name || input.sender_email) {
    lines.push(`From: ${[input.sender_name, input.sender_email ? `<${input.sender_email}>` : ""].filter(Boolean).join(" ")}`);
  }
  if (input.subject) {
    lines.push(`Subject: ${input.subject}`);
  }
  if (input.received_at) {
    lines.push(`Received: ${input.received_at}`);
  }
  lines.push("");
  lines.push(input.body_text?.trim() || "(no body)");

  return lines.join("\n");
}

/**
 * Call the Groq API and return a validated AgentOutput.
 * Throws a descriptive error on any failure — callers must catch.
 */
export async function callAgent(input: AgentInput): Promise<AgentOutput> {
  const apiKey = getGroqKey(); // throws if missing

  const userMessage = buildUserMessage(input);

  // Avoid logging raw email content at info level
  console.info(
    `[AutoOps AI] Calling agent. subject="${input.subject}" sender="${input.sender_email}"`
  );

  const groq = new Groq({ apiKey });
  let responseText: string;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temperature for consistent, deterministic output
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    responseText = response.choices[0]?.message?.content || "";

    if (typeof responseText !== "string" || !responseText.trim()) {
      throw new Error("Groq returned an empty or unexpected response shape.");
    }
  } catch (err) {
    // Re-throw with a prefixed message so callers can identify AI failures
    if (err instanceof Error) {
      throw new Error(`[AutoOps AI] API call failed: ${err.message}`);
    }
    throw new Error("[AutoOps AI] API call failed with an unknown error.");
  }

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(
      `[AutoOps AI] Model returned non-JSON response: ${responseText.slice(0, 200)}`
    );
  }

  // ── Validate with Zod ─────────────────────────────────────────────────────
  const validation = validateAgentOutput(parsed);
  if (!validation.success) {
    throw new Error(validation.error);
  }

  const raw = validation.data;

  // ── Derive suggested_action from classification ───────────────────────────
  const replyclassifications: Classification[] = ["urgent", "needs_reply"];
  const suggested_action: "reply" | "ignore" = replyclassifications.includes(
    raw.classification as Classification
  )
    ? "reply"
    : "ignore";

  console.info(
    `[AutoOps AI] Classification: ${raw.classification} | Confidence: ${raw.confidence} | Action: ${suggested_action}`
  );

  return {
    classification: raw.classification as Classification,
    drafted_reply: raw.drafted_reply ?? null,
    confidence: raw.confidence,
    reasoning: raw.reasoning,
    suggested_action,
  };
}
