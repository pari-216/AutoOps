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
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Query connected_accounts for google provider
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: account, error: dbError } = await (supabase
      .from("connected_accounts") as any)
      .select("id, provider, email, status, scopes, updated_at")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("status", "active")
      .maybeSingle();

    if (dbError) {
      return NextResponse.json(
        { error: "Database error checking status." },
        { status: 500 }
      );
    }

    if (!account) {
      return NextResponse.json({
        connected: false,
        email: null,
        status: "not_connected",
      });
    }

    return NextResponse.json({
      connected: true,
      email: account.email,
      status: account.status,
      updated_at: account.updated_at,
    });
  } catch (err) {
    console.error("[Google OAuth status] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
