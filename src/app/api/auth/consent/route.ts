import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LEGAL_CONFIG } from "@/lib/legal";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const termsVersion = body.termsVersion || LEGAL_CONFIG.currentTermsVersion;
    const privacyVersion = body.privacyVersion || LEGAL_CONFIG.currentPrivacyVersion;
    const now = new Date().toISOString();

    // Upsert into user_consents table
    const { error: upsertError } = await supabase
      .from("user_consents")
      .upsert(
        {
          user_id: user.id,
          terms_accepted_at: now,
          terms_version: termsVersion,
          privacy_acknowledged_at: now,
          privacy_version: privacyVersion,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.warn("[Consent API] Could not record consent in user_consents:", upsertError.message);
      // Non-fatal if table not migrated yet
    }

    // Also record in auth.user metadata for session-level caching
    await supabase.auth.updateUser({
      data: {
        terms_accepted_at: now,
        terms_version: termsVersion,
        privacy_acknowledged_at: now,
        privacy_version: privacyVersion,
      },
    });

    return NextResponse.json({
      success: true,
      termsVersion,
      privacyVersion,
      acceptedAt: now,
    });
  } catch (err: unknown) {
    console.error("[Consent API] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
