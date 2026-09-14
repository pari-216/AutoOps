import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_REPLY_LENGTH = 5000;

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

    let body: { action_id?: string; edited_reply?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const actionId = body?.action_id;
    const rawReply = body?.edited_reply;

    if (!actionId || typeof actionId !== "string" || !actionId.trim()) {
      return NextResponse.json(
        { error: "action_id is required." },
        { status: 400 }
      );
    }

    if (typeof rawReply !== "string") {
      return NextResponse.json(
        { error: "edited_reply must be a string." },
        { status: 400 }
      );
    }

    const cleanReply = rawReply.trim();
    if (!cleanReply) {
      return NextResponse.json(
        { error: "edited_reply cannot be empty or whitespace only." },
        { status: 400 }
      );
    }

    if (cleanReply.length > MAX_REPLY_LENGTH) {
      return NextResponse.json(
        { error: `edited_reply exceeds maximum allowed length of ${MAX_REPLY_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // Fetch existing action to verify ownership & status and capture original draft
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchError } = await (supabase
      .from("agent_actions") as any)
      .select("id, user_id, status, event_id, drafted_reply, original_drafted_reply")
      .eq("id", actionId.trim())
      .single();

    if (fetchError || !existing || existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "Action not found." },
        { status: 404 }
      );
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: `Action cannot be edited because current status is '${existing.status}'.` },
        { status: 409 }
      );
    }

    const originalDraft = existing.original_drafted_reply || existing.drafted_reply;
    const now = new Date().toISOString();

    // Atomic update: pending -> edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedAction, error: updateError } = await (supabase
      .from("agent_actions") as any)
      .update({
        status: "edited",
        drafted_reply: cleanReply,
        original_drafted_reply: originalDraft,
        updated_at: now,
        processed_at: now,
      })
      .eq("id", actionId.trim())
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id, event_id, status, drafted_reply, original_drafted_reply")
      .single();

    if (updateError || !updatedAction) {
      return NextResponse.json(
        { error: "Failed to update action. It may have been processed concurrently." },
        { status: 409 }
      );
    }

    // Record activity log entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: logError } = await (supabase.from("activity_log") as any).insert({
      user_id: user.id,
      agent_action_id: updatedAction.id,
      event_id: existing.event_id,
      action_type: "action_edited",
      before_data: {
        status: "pending",
        drafted_reply: existing.drafted_reply,
      },
      after_data: {
        status: "edited",
        drafted_reply: cleanReply,
      },
    });

    if (logError) {
      console.warn("[AutoOps edit] Failed to insert activity_log:", logError);
    }

    return NextResponse.json({ ok: true, action: updatedAction });
  } catch (err) {
    console.error("[AutoOps edit] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
