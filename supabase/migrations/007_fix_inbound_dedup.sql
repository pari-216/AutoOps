-- ====================================================================
-- AutoOps Phase 8: Fix Inbound Event Deduplication Indices
-- Migration File: 007_fix_inbound_dedup.sql
--
-- Ensures unique constraint on (user_id, source, external_event_id)
-- and (user_id, gmail_message_id) so that repeated Gmail ingestion syncs
-- and webhook deliveries cannot insert duplicate event rows.
--
-- NOTE: If your database contains existing duplicate rows, run the safe
-- deduplication cleanup script before applying these unique indices,
-- otherwise PostgreSQL will reject index creation with a unique violation.
-- ====================================================================

-- 1. Unique index on (user_id, source, external_event_id) for non-null external IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_events_dedup
  ON public.inbound_events (user_id, source, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- 2. Unique index on (user_id, gmail_message_id) for non-null Gmail Message-IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_events_gmail_message_id
  ON public.inbound_events (user_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

-- 3. Ensure agent_actions foreign key and lookup index are optimized
CREATE INDEX IF NOT EXISTS idx_agent_actions_user_status
  ON public.agent_actions (user_id, status);
