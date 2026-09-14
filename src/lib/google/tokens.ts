/**
 * tokens.ts — Server-side Google OAuth token management & refresh helper.
 *
 * Exposes getValidGoogleAccessToken(userId) to retrieve a valid, non-expired
 * access token for Google API calls (Gmail / Calendar). Performs automatic
 * background token refresh when necessary.
 *
 * NEVER exposes tokens to client-side code.
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface ConnectedGoogleAccount {
  id: string;
  user_id: string;
  provider: string;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  status: string;
}

/**
 * Retrieves a valid Google access token for the specified user.
 * Refreshes the token automatically if expired or near expiry.
 */
export async function getValidGoogleAccessToken(userId: string): Promise<string> {
  if (!userId) {
    throw new Error("[Google Tokens] userId is required.");
  }

  const supabase = createAdminClient();

  // 1. Query active Google connected account for the user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account, error: fetchError } = await (supabase
    .from("connected_accounts") as any)
    .select("id, user_id, provider, email, access_token, refresh_token, expires_at, status")
    .eq("user_id", userId)
    .eq("provider", "google")
    .eq("status", "active")
    .single();

  if (fetchError || !account) {
    throw new Error("Google account is not connected. Please connect your Google account in Settings.");
  }

  const record = account as ConnectedGoogleAccount;

  // 2. Check if current access token is valid (with 5-minute buffer)
  const BUFFER_MS = 5 * 60 * 1000;
  const now = Date.now();
  const expiresAtMs = record.expires_at ? new Date(record.expires_at).getTime() : 0;

  if (record.access_token && expiresAtMs - BUFFER_MS > now) {
    return record.access_token;
  }

  // 3. Token is expired or missing — refresh using refresh_token
  if (!record.refresh_token) {
    // Mark account as revoked/expired in database
    await (supabase.from("connected_accounts") as any)
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", record.id);

    throw new Error("Google access token expired and no refresh token is available. Please reconnect your account.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Server configuration error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.");
  }

  // Request new access token from Google
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: record.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errPayload = await response.text();
    console.error("[Google Tokens] Token refresh failed:", errPayload);

    // If revoked or invalid, mark account status as revoked
    if (response.status === 400 || response.status === 401) {
      await (supabase.from("connected_accounts") as any)
        .update({ status: "revoked", updated_at: new Date().toISOString() })
        .eq("id", record.id);
    }

    throw new Error("Google token refresh failed. Please reconnect your account in Settings.");
  }

  const tokenData = await response.json();
  const newAccessToken: string = tokenData.access_token;
  const expiresInSeconds: number = tokenData.expires_in || 3600;
  const newRefreshToken: string | undefined = tokenData.refresh_token;

  const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  // 4. Update stored tokens in DB
  const updatePayload: Record<string, unknown> = {
    access_token: newAccessToken,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  };

  if (newRefreshToken) {
    updatePayload.refresh_token = newRefreshToken;
  }

  await (supabase.from("connected_accounts") as any)
    .update(updatePayload)
    .eq("id", record.id);

  return newAccessToken;
}
