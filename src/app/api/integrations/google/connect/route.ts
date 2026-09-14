import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("[Google OAuth connect] GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI is missing.");
      return NextResponse.json(
        { error: "Server OAuth configuration missing. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI." },
        { status: 503 }
      );
    }

    // Generate state payload to prevent CSRF
    const statePayload = {
      userId: user.id,
      nonce: crypto.randomUUID(),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    // Scopes include gmail.readonly for multi-user inbox polling
    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    const response = NextResponse.redirect(googleAuthUrl);

    // Set short-lived state cookie for verification
    response.cookies.set("autoops_google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[Google OAuth connect] Error:", err);
    return NextResponse.json({ error: "Failed to initiate Google OAuth." }, { status: 500 });
  }
}
