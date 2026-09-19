import Link from "next/link";
import { Activity } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ActivityLogClient, ActivityLogRecord } from "./activity-log-client";

export const dynamic = "force-dynamic";

export default async function ActivityLogPage() {
  let logs: ActivityLogRecord[] = [];
  let fetchError: string | null = null;
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
          .from("activity_log")
          .select(
            "id, action_type, event_id, agent_action_id, before_data, after_data, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("[AutoOps] Activity log fetch failed:", error);
          fetchError = error.message || "Database query failed";
        } else {
          logs = (data as ActivityLogRecord[]) || [];
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[AutoOps] Activity log page error:", message);
      fetchError = message;
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Activity Log"
        description="Complete audit trail of every AI decision and human action in AutoOps."
      >
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 font-semibold text-xs"
        >
          <Link href="/dashboard">
            <Activity className="size-3.5 mr-1.5" />
            Dashboard
          </Link>
        </Button>
      </PageHeader>

      <ActivityLogClient
        initialLogs={logs}
        fetchError={fetchError}
        userId={userId}
      />
    </div>
  );
}
