-- ====================================================================
-- AutoOps Phase 5: Approval Workflow Extensions
-- Migration File: 004_approval_workflow.sql
--
-- Adds columns to agent_actions for human edit tracking & audit:
--   - original_drafted_reply: preserves original AI draft when edited by human
--   - processed_at: timestamp when human approved, edited, or rejected the action
-- ====================================================================

ALTER TABLE public.agent_actions
  ADD COLUMN IF NOT EXISTS original_drafted_reply TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Index to quickly query actions processed on a given date / range
CREATE INDEX IF NOT EXISTS idx_agent_actions_processed_at
  ON public.agent_actions (processed_at)
  WHERE processed_at IS NOT NULL;
