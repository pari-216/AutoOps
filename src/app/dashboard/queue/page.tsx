import { PageHeader } from "@/components/dashboard/page-header";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ApprovalQueueClient, AgentActionWithEvent } from "./approval-queue-client";

export const dynamic = "force-dynamic";

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

        const { data, error } = await supabase
          .from("agent_actions")
          .select("*, inbound_events(sender_email, sender_name, subject, body_text, received_at)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[ApprovalQueuePage] Supabase query error:", error);
        } else if (data) {
          actions = data as unknown as AgentActionWithEvent[];
        }
      }
    } catch (err) {
      console.error("[ApprovalQueuePage] Unexpected error loading queue:", err);
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
