-- ====================================================================
-- AutoOps Phase 2: Core Database Schema & Row Level Security (RLS)
-- Migration File: 001_initial_schema.sql
-- ====================================================================

-- Enable pgcrypto extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- TABLE 1: connected_accounts
-- Purpose: Stores external accounts connected to AutoOps (e.g. Gmail).
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  scopes TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_connected_accounts_status CHECK (status IN ('active', 'inactive', 'revoked'))
);

-- --------------------------------------------------------------------
-- TABLE 2: inbound_events
-- Purpose: Stores incoming operational events (emails from Zapier/Gmail).
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inbound_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  external_event_id TEXT,
  sender_email TEXT,
  sender_name TEXT,
  subject TEXT,
  body_text TEXT,
  received_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- TABLE 3: agent_actions
-- Purpose: Stores AI classifications, suggestions, and drafted actions.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.inbound_events(id) ON DELETE CASCADE,
  classification TEXT,
  suggested_action TEXT,
  drafted_reply TEXT,
  confidence NUMERIC(5,2),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_agent_actions_classification CHECK (
    classification IS NULL OR classification IN ('urgent', 'needs_reply', 'fyi', 'spam_like')
  ),
  CONSTRAINT chk_agent_actions_suggested_action CHECK (
    suggested_action IS NULL OR suggested_action IN ('reply', 'schedule', 'ignore')
  ),
  CONSTRAINT chk_agent_actions_status CHECK (
    status IN ('pending', 'approved', 'edited', 'rejected')
  )
);

-- --------------------------------------------------------------------
-- TABLE 4: activity_log
-- Purpose: Stores audit trail of operational actions.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.inbound_events(id) ON DELETE SET NULL,
  agent_action_id UUID REFERENCES public.agent_actions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- INDEXES
-- Optimize performance for frequent queries by user_id and timestamps
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON public.connected_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_inbound_events_user_id ON public.inbound_events(user_id);
CREATE INDEX IF NOT EXISTS idx_inbound_events_received_at ON public.inbound_events(received_at);

CREATE INDEX IF NOT EXISTS idx_agent_actions_user_id ON public.agent_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON public.agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON public.agent_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at);

-- --------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Ensure every user's operational data is strictly isolated.
-- --------------------------------------------------------------------
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for connected_accounts
CREATE POLICY connected_accounts_select_policy ON public.connected_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY connected_accounts_insert_policy ON public.connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY connected_accounts_update_policy ON public.connected_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY connected_accounts_delete_policy ON public.connected_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for inbound_events
CREATE POLICY inbound_events_select_policy ON public.inbound_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY inbound_events_insert_policy ON public.inbound_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY inbound_events_update_policy ON public.inbound_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY inbound_events_delete_policy ON public.inbound_events
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for agent_actions
CREATE POLICY agent_actions_select_policy ON public.agent_actions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY agent_actions_insert_policy ON public.agent_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY agent_actions_update_policy ON public.agent_actions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY agent_actions_delete_policy ON public.agent_actions
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for activity_log
CREATE POLICY activity_log_select_policy ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY activity_log_insert_policy ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY activity_log_update_policy ON public.activity_log
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY activity_log_delete_policy ON public.activity_log
  FOR DELETE USING (auth.uid() = user_id);
