import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./config";

/**
 * Creates a Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads and writes session cookies via next/headers.
 * Throws a helpful error if the environment variables are missing —
 * Phase 1 pages never call this, so the app runs without configuration.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore when middleware
          // refreshes user sessions.
        }
      },
    },
  });
}

export { isSupabaseConfigured } from "./config";
