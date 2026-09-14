import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    let body: { action_id?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const actionId = body?.action_id;
    if (!actionId || typeof actionId !== "string" || !actionId.trim()) {
      return NextResponse.json(
        { error: "action_id is required." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Atomic update: pending -> rejected
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedAction, error: updateError } = await (supabase
      .from("agent_actions") as any)
      .update({
        status: "rejected",
        updated_at: now,
        processed_at: now,
      })
      .eq("id", actionId.trim())
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id, event_id, status")
      .single();

    if (updateError || !updatedAction) {
      // Check if action exists for user to give clear error message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase
        .from("agent_actions") as any)
        .select("id, status, user_id")
        .eq("id", actionId.trim())
        .single();

      if (!existing || existing.user_id !== user.id) {
        return NextResponse.json(
          { error: "Action not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Action cannot be rejected because current status is '${existing.status}'.` },
        { status: 409 }
      );
    }

    // Record activity log entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: logError } = await (supabase.from("activity_log") as any).insert({
      user_id: user.id,
      agent_action_id: updatedAction.id,
      event_id: updatedAction.event_id,
      action_type: "action_rejected",
      before_data: { status: "pending" },
      after_data: { status: "rejected" },
    });

    if (logError) {
      console.warn("[AutoOps reject] Failed to insert activity_log:", logError);
    }

    return NextResponse.json({ ok: true, action: updatedAction });
  } catch (err) {
    console.error("[AutoOps reject] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
