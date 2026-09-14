import { PageHeader } from "@/components/dashboard/page-header";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ApprovalQueueClient, AgentActionWithEvent } from "./approval-queue-client";

export default async function ApprovalQueuePage() {
  let actions: AgentActionWithEvent[] = [];
  let userId = "";

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;

        const select =
          "id, user_id, event_id, classification, suggested_action, drafted_reply, original_drafted_reply, confidence, reason, status, execution_status, executed_at, execution_error, external_action_id, created_at, processed_at, inbound_events(sender_email, sender_name, subject, received_at)";

        const { data } = await supabase
          .from("agent_actions")
          .select(select)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        actions = (data as unknown as AgentActionWithEvent[]) || [];
      }
    } catch {
      // Gracefully handle unconfigured / connection errors
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Approval Queue"
        description="Review AI decisions before any operational action is taken."
      />

      <ApprovalQueueClient initialActions={actions} userId={userId} />
    </div>
  );
}
