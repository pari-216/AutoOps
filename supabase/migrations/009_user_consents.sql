-- ====================================================================
-- AutoOps Phase 9: User Legal Consents Schema
-- Migration File: 009_user_consents.sql
--
-- Tracks user agreement to Terms of Service and Privacy Policy versions.
-- All columns are nullable / have defaults to maintain backwards compatibility
-- with existing accounts.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  privacy_acknowledged_at TIMESTAMPTZ,
  privacy_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_consents_user_id UNIQUE (user_id)
);

-- Row Level Security (RLS)
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consent record"
  ON public.user_consents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent record"
  ON public.user_consents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consent record"
  ON public.user_consents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id
  ON public.user_consents (user_id);
