-- ====================================================================
-- AutoOps Phase 6 Correction: Multi-User Gmail Sync Tracking Schema
-- Migration File: 006_gmail_sync_tracking.sql
--
-- Adds last_synced_at column to connected_accounts table to maintain a high-water mark
-- for direct Gmail API multi-user inbox polling.
-- ====================================================================

ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Index to optimize querying accounts that require periodic cron sync
CREATE INDEX IF NOT EXISTS idx_connected_accounts_sync
  ON public.connected_accounts (provider, status, last_synced_at);
