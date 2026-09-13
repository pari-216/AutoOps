/**
 * admin.ts — Supabase service-role client
 *
 * This client bypasses Row Level Security and is ONLY for use inside
 * trusted server-side code (Route Handlers, scripts). It must NEVER be
 * imported by client-side modules or exposed to the browser.
 *
 * Required environment variables:
 *   SUPABASE_SERVICE_ROLE_KEY   — service_role secret (never NEXT_PUBLIC_)
 *   NEXT_PUBLIC_SUPABASE_URL    — project URL (shared with browser client)
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./config";

let _adminClient: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Returns a singleton Supabase admin client using the service-role key.
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function createAdminClient(): ReturnType<typeof createSupabaseClient> {
  if (_adminClient) return _adminClient;

  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "[AutoOps] SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Add it to .env.local (server-only, never NEXT_PUBLIC_). " +
        "Find it in Supabase Dashboard → Project Settings → API → service_role."
    );
  }

  _adminClient = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      // Disable auto session refresh — the admin client does not manage sessions
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
