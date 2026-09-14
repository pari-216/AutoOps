"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Bot,
  Globe,
  Link2,
  Mail,
  Plug,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  LogOut,
  Calendar,
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

interface GoogleStatusState {
  loading: boolean;
  connected: boolean;
  email: string | null;
  status: string | null;
  error: string | null;
}

export default function SettingsPage() {
  const { settings, updateSetting } = useAutoOps();

  const [googleState, setGoogleState] = useState<GoogleStatusState>({
    loading: true,
    connected: false,
    email: null,
    status: null,
    error: null,
  });

  const [disconnecting, setDisconnecting] = useState(false);

  // Fetch real Google connection status on mount
  const fetchGoogleStatus = async () => {
    setGoogleState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/integrations/google/status");
      if (!res.ok) {
        setGoogleState({
          loading: false,
          connected: false,
          email: null,
          status: "not_connected",
          error: "Failed to query Google connection status.",
        });
        return;
      }
      const data = await res.json();
      setGoogleState({
        loading: false,
        connected: !!data.connected,
        email: data.email || null,
        status: data.status || "not_connected",
        error: null,
      });
    } catch {
      setGoogleState({
        loading: false,
        connected: false,
        email: null,
        status: "error",
        error: "Network error fetching Google status.",
      });
    }
  };

  useEffect(() => {
    fetchGoogleStatus();
  }, []);

  const handleConnectGoogle = () => {
    window.location.href = "/api/integrations/google/connect";
  };

  const handleDisconnectGoogle = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
      });
      if (res.ok) {
        setGoogleState({
          loading: false,
          connected: false,
          email: null,
          status: "not_connected",
          error: null,
        });
      } else {
        const data = await res.json();
        setGoogleState((prev) => ({ ...prev, error: data.error || "Failed to disconnect Google." }));
      }
    } catch {
      setGoogleState((prev) => ({ ...prev, error: "Network error disconnecting Google." }));
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Settings"
        description="Manage connected integrations, OAuth credentials, and AI agent behavior."
      />

      {/* Connected Accounts Card */}
      <Card className="animate-fade-up border-violet-100/80 shadow-sm shadow-violet-500/5 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Plug className="size-4.5 text-violet-600" />
            Connected Integrations
          </CardTitle>
          <CardDescription>
            Authorize Google APIs for real Gmail email dispatch and Google Calendar event creation.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-4">
          {/* Google Account Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/60 to-transparent p-5 transition-colors hover:border-violet-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-violet-100">
                <Mail className="size-5 text-violet-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm">Google Workspace (Gmail & Calendar)</p>
                  {googleState.loading ? (
                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                      <Loader2 className="size-3 animate-spin mr-1" /> Checking...
                    </Badge>
                  ) : googleState.connected ? (
                    <Badge variant="outline" className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                      <CheckCircle2 className="size-3 mr-1" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700 font-semibold">
                      Not connected
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground text-xs mt-0.5">
                  {googleState.connected
                    ? `Connected as ${googleState.email || "Google Account"}. Grants Gmail send and Calendar event access.`
                    : "Connect your Google Account to authorize Gmail reply dispatch and Calendar event creation."}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {googleState.loading ? (
                <Button disabled variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                  <Loader2 className="size-3.5 animate-spin mr-1" /> Loading
                </Button>
              ) : googleState.connected ? (
                <>
                  <Button
                    onClick={handleConnectGoogle}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-semibold border-violet-200 text-violet-700 hover:bg-violet-50"
                  >
                    <RefreshCw className="size-3.5 mr-1" /> Reconnect
                  </Button>
                  <Button
                    onClick={handleDisconnectGoogle}
                    disabled={disconnecting}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    {disconnecting ? (
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <LogOut className="size-3.5 mr-1" />
                    )}
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConnectGoogle}
                  size="sm"
                  className="rounded-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25 hover:from-violet-700 hover:to-purple-700 transition-all text-xs"
                >
                  <Plug className="size-3.5 mr-1" /> Connect Google Account
                </Button>
              )}
            </div>
          </div>

          {googleState.error && (
            <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
              <AlertTriangle className="size-3.5" /> {googleState.error}
            </p>
          )}

          {/* Integration Capabilities summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-start gap-2.5">
              <Mail className="size-4 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Gmail API Dispatch</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sends native RFC 2822 email replies while preserving Gmail conversation threads.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-start gap-2.5">
              <Calendar className="size-4 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Google Calendar API</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Creates scheduled calendar events directly on your primary Google Calendar.
                </p>
              </div>
            </div>
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
            Tune how your custom AI reasoning engine drafts and executes actions.
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
                <p className="text-sm font-bold">Mandatory Human Approval</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Queue all AI recommendations for human review. No auto-dispatch.
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
