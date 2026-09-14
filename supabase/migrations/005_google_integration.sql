-- ====================================================================
-- AutoOps Phase 6: Real Gmail, Calendar & Outbound Execution Schema
-- Migration File: 005_google_integration.sql
--
-- 1. Extends connected_accounts to support OAuth token storage:
--    - email: Google account email
--    - access_token: OAuth access token (server-side only)
--    - refresh_token: OAuth refresh token (server-side only)
--    - expires_at: Token expiry timestamp
--
-- 2. Extends agent_actions to track execution state lifecycle:
--    - execution_status: 'unexecuted' | 'executing' | 'executed' | 'failed'
--    - executed_at: Timestamp when execution completed
--    - execution_error: Error message if execution failed
--    - external_action_id: Message ID / Calendar Event ID returned by Google API
--
-- 3. Extends inbound_events for reliable Gmail threading metadata:
--    - gmail_message_id: Message-ID header / Gmail ID
--    - gmail_thread_id: Gmail thread ID
-- ====================================================================

-- 1. connected_accounts extensions
ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. agent_actions extensions
ALTER TABLE public.agent_actions
  ADD COLUMN IF NOT EXISTS execution_status TEXT NOT NULL DEFAULT 'unexecuted',
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_error TEXT,
  ADD COLUMN IF NOT EXISTS external_action_id TEXT;

-- Update agent_actions status constraint to allow execution states if enforced
DO $$
BEGIN
  -- Drop existing status check constraint if it exists so we can update it safely
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'agent_actions' AND constraint_name = 'chk_agent_actions_status'
  ) THEN
    ALTER TABLE public.agent_actions DROP CONSTRAINT chk_agent_actions_status;
  END IF;

  ALTER TABLE public.agent_actions
    ADD CONSTRAINT chk_agent_actions_status CHECK (
      status IN ('pending', 'approved', 'edited', 'rejected', 'executing', 'executed', 'failed')
    );
END $$;

-- Execution status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'agent_actions' AND constraint_name = 'chk_agent_actions_execution_status'
  ) THEN
    ALTER TABLE public.agent_actions
      ADD CONSTRAINT chk_agent_actions_execution_status CHECK (
        execution_status IN ('unexecuted', 'executing', 'executed', 'failed')
      );
  END IF;
END $$;

-- 3. inbound_events extensions
ALTER TABLE public.inbound_events
  ADD COLUMN IF NOT EXISTS gmail_message_id TEXT,
  ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_provider
  ON public.connected_accounts (user_id, provider);

CREATE INDEX IF NOT EXISTS idx_agent_actions_execution_status
  ON public.agent_actions (execution_status);
