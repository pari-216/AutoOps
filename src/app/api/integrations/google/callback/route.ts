import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const dashboardSettingsUrl = new URL("/dashboard/settings", req.url);

  if (error) {
    console.error("[Google OAuth callback] OAuth error received:", error);
    dashboardSettingsUrl.searchParams.set("google", "error");
    dashboardSettingsUrl.searchParams.set("reason", error);
    return NextResponse.redirect(dashboardSettingsUrl);
  }

  if (!code || !state) {
    console.error("[Google OAuth callback] Missing code or state parameter.");
    dashboardSettingsUrl.searchParams.set("google", "error");
    dashboardSettingsUrl.searchParams.set("reason", "missing_code_or_state");
    return NextResponse.redirect(dashboardSettingsUrl);
  }

  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      dashboardSettingsUrl.searchParams.set("google", "error");
      dashboardSettingsUrl.searchParams.set("reason", "unauthorized");
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    // 2. Validate state cookie
    const savedState = req.cookies.get("autoops_google_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      console.error("[Google OAuth callback] Invalid or mismatched OAuth state.");
      dashboardSettingsUrl.searchParams.set("google", "error");
      dashboardSettingsUrl.searchParams.set("reason", "invalid_state");
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    // Verify user ID in state
    try {
      const parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      if (parsedState.userId !== user.id) {
        console.error("[Google OAuth callback] State userId mismatch.");
        dashboardSettingsUrl.searchParams.set("google", "error");
        dashboardSettingsUrl.searchParams.set("reason", "user_mismatch");
        return NextResponse.redirect(dashboardSettingsUrl);
      }
    } catch {
      console.error("[Google OAuth callback] Failed to parse state payload.");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("[Google OAuth callback] Server OAuth configuration missing.");
      dashboardSettingsUrl.searchParams.set("google", "error");
      dashboardSettingsUrl.searchParams.set("reason", "server_config");
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    // 3. Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const tokenErrText = await tokenResponse.text();
      console.error("[Google OAuth callback] Token exchange failed:", tokenErrText);
      dashboardSettingsUrl.searchParams.set("google", "error");
      dashboardSettingsUrl.searchParams.set("reason", "token_exchange_failed");
      return NextResponse.redirect(dashboardSettingsUrl);
    }

    const tokenData = await tokenResponse.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresInSeconds: number = tokenData.expires_in || 3600;
    const grantedScopeStr: string = tokenData.scope || "";

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 4. Retrieve Google Account Profile
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let googleEmail: string | null = null;
    let googleAccountId: string | null = null;

    if (userinfoRes.ok) {
      const info = await userinfoRes.json();
      googleEmail = info.email || null;
      googleAccountId = info.id || null;
    }

    // 5. Store in connected_accounts using admin client
    const adminSupabase = createAdminClient();

    // Check for existing connection to preserve refresh token if Google didn't issue a new one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingAcc } = await (adminSupabase
      .from("connected_accounts") as any)
      .select("id, refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    const finalRefreshToken = refreshToken || existingAcc?.refresh_token || null;

    const accountData = {
      user_id: user.id,
      provider: "google",
      provider_account_id: googleAccountId,
      email: googleEmail,
      access_token: accessToken,
      refresh_token: finalRefreshToken,
      expires_at: expiresAt,
      scopes: grantedScopeStr ? grantedScopeStr.split(" ") : [],
      status: "active",
      updated_at: new Date().toISOString(),
    };

    if (existingAcc) {
      // Update existing record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminSupabase.from("connected_accounts") as any)
        .update(accountData)
        .eq("id", existingAcc.id);
    } else {
      // Insert new record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminSupabase.from("connected_accounts") as any).insert(accountData);
    }

    // 6. Record activity log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase.from("activity_log") as any).insert({
      user_id: user.id,
      action_type: "google_connected",
      after_data: {
        provider: "google",
        email: googleEmail,
        provider_account_id: googleAccountId,
      },
    });

    // 7. Redirect back to dashboard settings with success indicator
    dashboardSettingsUrl.searchParams.set("google", "connected");
    const response = NextResponse.redirect(dashboardSettingsUrl);
    response.cookies.delete("autoops_google_oauth_state");
    return response;
  } catch (err) {
    console.error("[Google OAuth callback] Unexpected error:", err);
    dashboardSettingsUrl.searchParams.set("google", "error");
    dashboardSettingsUrl.searchParams.set("reason", "internal_error");
    return NextResponse.redirect(dashboardSettingsUrl);
  }
}
