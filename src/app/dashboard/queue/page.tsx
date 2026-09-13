import { Clock3, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

interface AgentActionRecord {
  id: string;
  classification: string | null;
  suggested_action: string | null;
  drafted_reply: string | null;
  confidence: number | null;
  reason: string | null;
  status: string;
  created_at: string;
}

export default async function ApprovalQueuePage() {
  let pendingActions: AgentActionRecord[] = [];
  let approvedActions: AgentActionRecord[] = [];
  let rejectedActions: AgentActionRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: pendingData } = await supabase
          .from("agent_actions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        const { data: approvedData } = await supabase
          .from("agent_actions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        const { data: rejectedData } = await supabase
          .from("agent_actions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "rejected")
          .order("created_at", { ascending: false });

        pendingActions = (pendingData as AgentActionRecord[]) || [];
        approvedActions = (approvedData as AgentActionRecord[]) || [];
        rejectedActions = (rejectedData as AgentActionRecord[]) || [];
      }
    } catch {
      // Gracefully handle missing config
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Approval Queue"
        description="Review AI decisions before any operational action is taken."
      />

      <Tabs defaultValue="pending" className="gap-6">
        <TabsList className="h-12 rounded-xl border border-violet-100 bg-white/80 p-1.5 shadow-sm backdrop-blur">
          <TabsTrigger
            value="pending"
            className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-violet-500/20"
          >
            <Clock3 className="size-4" />
            Pending ({pendingActions.length})
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/20"
          >
            <CheckCircle2 className="size-4" />
            Approved ({approvedActions.length})
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-rose-500/20"
          >
            <XCircle className="size-4" />
            Rejected ({rejectedActions.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4 pt-4">
          {pendingActions.length === 0 ? (
            <Card className="border-violet-100/90 bg-white/80 p-12 text-center shadow-xs rounded-2xl">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-600 mb-4">
                <Inbox className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No pending approvals</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
                When your AI agent suggests an action from incoming operational emails, it will land here for your one-tap review before anything is dispatched.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingActions.map((action) => (
                <Card
                  key={action.id}
                  className="border-violet-100 bg-white p-6 rounded-2xl shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-violet-200 text-violet-700 text-xs font-bold">
                      {action.classification || "General Action"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{action.suggested_action}</p>
                  {action.drafted_reply && (
                    <p className="text-xs text-muted-foreground bg-violet-50/60 p-3 rounded-xl border border-violet-100 font-mono">
                      {action.drafted_reply}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4 pt-4">
          {approvedActions.length === 0 ? (
            <Card className="border-violet-100/90 bg-white/80 p-12 text-center shadow-xs rounded-2xl">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
                <CheckCircle2 className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Nothing approved yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Approvals you grant will be listed here with full execution records.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvedActions.map((action) => (
                <Card key={action.id} className="border-emerald-100 bg-white p-5 rounded-2xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold">
                      Approved
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{action.suggested_action}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="space-y-4 pt-4">
          {rejectedActions.length === 0 ? (
            <Card className="border-violet-100/90 bg-white/80 p-12 text-center shadow-xs rounded-2xl">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <XCircle className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Nothing rejected yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Suggestions you decline will be archived here to help train your agent.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {rejectedActions.map((action) => (
                <Card key={action.id} className="border-rose-100 bg-white p-5 rounded-2xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs font-bold">
                      Rejected
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{action.suggested_action}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
