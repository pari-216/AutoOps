import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: account } = await (adminSupabase
      .from("connected_accounts") as any)
      .select("id, email, access_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("status", "active")
      .maybeSingle();

    if (!account) {
      return NextResponse.json(
        { error: "No active Google connection found." },
        { status: 404 }
      );
    }

    // Optional: revoke token at Google endpoint
    if (account.access_token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.access_token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }).catch((err) => {
        console.warn("[Google OAuth disconnect] Token revoke warning:", err);
      });
    }

    // Update status to revoked
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase.from("connected_accounts") as any)
      .update({
        status: "revoked",
        access_token: null,
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    // Record activity log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase.from("activity_log") as any).insert({
      user_id: user.id,
      action_type: "google_disconnected",
      after_data: {
        provider: "google",
        email: account.email,
      },
    });

    return NextResponse.json({ ok: true, message: "Google account disconnected." });
  } catch (err) {
    console.error("[Google OAuth disconnect] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
