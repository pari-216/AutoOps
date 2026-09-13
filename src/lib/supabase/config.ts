export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Returns true when both Supabase environment variables are present.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Reads and validates the Supabase environment variables.
 * Normalizes URL by removing /rest/v1 suffixes if present.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !anonKey) {
    throw new Error(
      "[AutoOps] Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see .env.example), then restart the dev server."
    );
  }

  // Strip trailing /rest/v1/ or slashes to ensure valid base URL for Supabase JS client
  const url = rawUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

  return { url, anonKey };
}
