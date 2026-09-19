-- ====================================================================
-- AutoOps: Enforce Unique Agent Action per Inbound Event
-- Migration File: 008_agent_actions_unique_event.sql
--
-- Ensures one agent_action per (user_id, event_id) for non-null event_id values.
-- Eliminates race conditions where concurrent inbound ingestion or AI processing
-- could create multiple agent_actions for the same inbound_event.
-- ====================================================================

-- 1. Partial unique index on (user_id, event_id) where event_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_actions_user_event_unique
  ON public.agent_actions (user_id, event_id)
  WHERE event_id IS NOT NULL;
