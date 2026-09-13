-- ====================================================================
-- AutoOps Phase 3: Inbound Event Deduplication Index
-- Migration File: 002_inbound_event_dedup.sql
--
-- Adds a partial unique index on inbound_events(user_id, source,
-- external_event_id) so that duplicate Zapier webhook deliveries for
-- the same email are silently ignored via ON CONFLICT DO NOTHING.
-- The index is partial (WHERE external_event_id IS NOT NULL) so rows
-- without a Zapier message ID are never falsely deduplicated.
-- ====================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_events_dedup
  ON public.inbound_events (user_id, source, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- ====================================================================
-- Service-role bypass policy for webhook inserts
--
-- The inbound webhook uses the Supabase service-role key, which
-- bypasses RLS by default. However, we add an explicit service-role
-- INSERT policy here so that future tightening of global RLS defaults
-- does not silently break ingestion.
--
-- NOTE: "service_role" is a built-in Supabase role; this policy is a
-- no-op for normal authenticated requests.
-- ====================================================================

-- Allow the service role to insert rows for any user_id.
-- This is intentional: the webhook server controls user_id, not the
-- caller — it is set from AUTOOPS_WEBHOOK_USER_ID (an env var).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inbound_events'
      AND policyname = 'inbound_events_service_role_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY inbound_events_service_role_insert
        ON public.inbound_events
        FOR INSERT
        TO service_role
        WITH CHECK (true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'activity_log'
      AND policyname = 'activity_log_service_role_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY activity_log_service_role_insert
        ON public.activity_log
        FOR INSERT
        TO service_role
        WITH CHECK (true)
    $policy$;
  END IF;
END;
$$;
