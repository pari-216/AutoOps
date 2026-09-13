"use client";

import {
  Bell,
  Bot,
  Globe,
  Link2,
  Mail,
  Plug,
  CheckCircle2,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutoOps } from "@/context/autoops-context";

export default function SettingsPage() {
  const { gmailConnected, connectGmail, settings, updateSetting } = useAutoOps();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Settings"
        description="Manage accounts, agent behavior, and how AutoOps stays in touch."
      />

      {/* Connected accounts */}
      <Card className="animate-fade-up border-violet-100/80 shadow-sm shadow-violet-500/5 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Plug className="size-4.5 text-violet-600" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Link the operational tools AutoOps monitors on your behalf.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/60 to-transparent p-4 transition-colors hover:border-violet-200">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-violet-100">
                <Mail className="size-5 text-violet-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm">Gmail Workspace</p>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      gmailConnected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-violet-200 bg-violet-50 text-violet-700"
                    }`}
                  >
                    {gmailConnected ? "Connected (Simulated)" : "Not connected"}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  Monitor operational email and draft intelligent actions.
                </p>
              </div>
            </div>
            <Button
              onClick={connectGmail}
              className={`rounded-xl font-bold shadow-md transition-transform hover:scale-105 ${
                gmailConnected
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gradient-to-r from-violet-600 to-purple-600 shadow-violet-500/25 text-white"
              }`}
            >
              {gmailConnected ? (
                <>
                  <CheckCircle2 className="size-4" /> Connected
                </>
              ) : (
                "Connect Gmail"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI agent preferences */}
      <Card
        className="animate-fade-up border-violet-100/80 shadow-sm shadow-violet-500/5 rounded-2xl"
        style={{ animationDelay: "100ms" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Bot className="size-4.5 text-violet-600" />
            AI Agent Preferences
          </CardTitle>
          <CardDescription>
            Tune how your operations agent drafts and decides.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="divide-y divide-violet-100/70 pt-2">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-start gap-3">
              <div className="bg-violet-50 mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg text-violet-600">
                <Globe className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Professional Response Tone</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Draft responses matching your professional brand voice.
                </p>
              </div>
            </div>
            <Switch
              checked={settings.responseTone}
              onCheckedChange={(v) => updateSetting("responseTone", v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-start gap-3">
              <div className="bg-violet-50 mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg text-violet-600">
                <Link2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Always Require Human Approval</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Queue all suggestions for human review before sending.
                </p>
              </div>
            </div>
            <Switch
              checked={settings.suggestBeforeSending}
              onCheckedChange={(v) => updateSetting("suggestBeforeSending", v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-start gap-3">
              <div className="bg-violet-50 mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg text-violet-600">
                <Bot className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Contextual AI Learning</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Improve suggestion precision based on your approval history.
                </p>
              </div>
            </div>
            <Switch
              checked={settings.contextualLearning}
              onCheckedChange={(v) => updateSetting("contextualLearning", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card
        className="animate-fade-up border-violet-100/80 shadow-sm shadow-violet-500/5 rounded-2xl"
        style={{ animationDelay: "200ms" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Bell className="size-4.5 text-violet-600" />
            Notifications & Alerts
          </CardTitle>
          <CardDescription>
            Choose when AutoOps should alert you.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="divide-y divide-violet-100/70 pt-2">
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-bold">Approval Request Emails</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Notify me when the agent has a draft ready for review.
              </p>
            </div>
            <Switch
              checked={settings.approvalRequests}
              onCheckedChange={(v) => updateSetting("approvalRequests", v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-bold">Daily Morning Summary</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                A morning summary digest of all operational tasks handled.
              </p>
            </div>
            <Switch
              checked={settings.dailyDigest}
              onCheckedChange={(v) => updateSetting("dailyDigest", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
