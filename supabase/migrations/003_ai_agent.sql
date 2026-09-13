-- ====================================================================
-- AutoOps Phase 4: AI Agent Deduplication Constraint
-- Migration File: 003_ai_agent.sql
--
-- Prevents the same inbound_event from being processed by the AI
-- agent more than once by adding a partial unique index on
-- agent_actions(event_id) where status != 'rejected'.
--
-- A rejected action can be reprocessed (e.g. after correcting a bad
-- prompt), but pending/approved/edited actions block a second run.
-- ====================================================================

-- Partial unique index: one active AI action per inbound event.
-- "Active" = not rejected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_actions_event_id_active
  ON public.agent_actions (event_id)
  WHERE status != 'rejected' AND event_id IS NOT NULL;

-- Index to speed up joins from agent_actions → inbound_events
CREATE INDEX IF NOT EXISTS idx_agent_actions_event_id
  ON public.agent_actions (event_id);
