import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeApprovedAction } from "@/lib/execution/dispatcher";

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

    // Atomic update: pending -> approved
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedAction, error: updateError } = await (supabase
      .from("agent_actions") as any)
      .update({
        status: "approved",
        updated_at: now,
      })
      .eq("id", actionId.trim())
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id, event_id, status, drafted_reply")
      .single();

    if (updateError || !updatedAction) {
      if (updateError) {
        console.error("[AutoOps approve] Update failed:", updateError);
      }
      // Check if action exists for user to give clear error code
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

      if (existing.status !== "pending") {
        return NextResponse.json(
          { error: `Action cannot be approved because current status is '${existing.status}'.` },
          { status: 409 }
        );
      }

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Failed to update action." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Action could not be approved due to a concurrent update." },
        { status: 409 }
      );
    }

    // Record activity log entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: logError } = await (supabase.from("activity_log") as any).insert({
      user_id: user.id,
      agent_action_id: updatedAction.id,
      event_id: updatedAction.event_id,
      action_type: "action_approved",
      before_data: { status: "pending" },
      after_data: { status: "approved" },
    });

    if (logError) {
      console.warn("[AutoOps approve] Failed to insert activity_log:", logError);
    }

    // Trigger execution pipeline (Gmail reply / Calendar event / Zapier outbound)
    let executionResult = null;
    try {
      executionResult = await executeApprovedAction(updatedAction.id, user.id);
    } catch (execErr) {
      console.error(`[AutoOps approve] Execution error for action ${updatedAction.id}:`, execErr);
      executionResult = {
        success: false,
        actionId: updatedAction.id,
        executionStatus: "failed",
        error: execErr instanceof Error ? execErr.message : "Execution failed",
      };
    }

    if (!executionResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: executionResult.error || "Execution failed.",
          action: updatedAction,
          execution: executionResult,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: {
        ...updatedAction,
        execution_status: executionResult.executionStatus,
        external_action_id: executionResult.externalActionId ?? null,
      },
      execution: executionResult,
    });
  } catch (err) {
    console.error("[AutoOps approve] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
