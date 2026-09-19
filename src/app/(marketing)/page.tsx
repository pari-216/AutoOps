"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Inbox,
  Lock,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
  Calendar,
  LayoutDashboard,
  Check,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";

import { HeroInteractiveBackground } from "@/components/hero-interactive-background";
import { WorkflowDiagram } from "@/components/workflow-diagram";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const features = [
  {
    icon: Inbox,
    title: "AI Email Intelligence",
    description:
      "AutoOps reads incoming operational emails, extracts context, and drafts the right action — invoices, scheduling, client follow-ups, and vendor updates.",
    tag: "Context Aware",
  },
  {
    icon: CheckCircle2,
    title: "Human Approval First",
    description:
      "Nothing happens until you approve it. Every recommendation lands in your approval queue for a fast, one-tap review before anything is sent.",
    tag: "You Stay in Control",
  },
  {
    icon: Sparkles,
    title: "Automated Execution",
    description:
      "Approved actions dispatch immediately through Gmail and Google Calendar while every transition is immutably recorded in your activity log.",
    tag: "Direct API Dispatch",
  },
  {
    icon: ShieldCheck,
    title: "Multi-Tenant RLS Security",
    description:
      "PostgreSQL Row-Level Security and strict token isolation ensure your business data and connected accounts remain completely private.",
    tag: "Enterprise Privacy",
  },
  {
    icon: Layers,
    title: "Realtime Queue Synchronization",
    description:
      "Realtime WebSocket feeds keep your team in sync. Changes, approvals, and status transitions update instantaneously without manual refresh.",
    tag: "Live Realtime",
  },
  {
    icon: Zap,
    title: "Zero Complex Configuration",
    description:
      "Connect your Google Workspace in seconds and let AutoOps begin monitoring operational channels with calibrated AI classification.",
    tag: "Instant Setup",
  },
];

const pipelineExamples = [
  {
    id: "invoice",
    title: "Client Billing",
    icon: Mail,
    sender: "Acme Corp (billing@acmecorp.com)",
    subject: "Please send Invoice #1042 for web development project",
    classification: "Needs Reply",
    confidence: "98% Confidence",
    suggestedAction: "Send Invoice Response",
    draftReply: "Attached is Invoice #1042 ($2,450.00). Net-30 payment link included. Let us know if you need anything else!",
    outcome: "Gmail API dispatched reply with attached invoice record",
  },
  {
    id: "meeting",
    title: "Calendar Sync",
    icon: Calendar,
    sender: "Sarah Chen (sarah@techstartup.io)",
    subject: "Free for 30-min product strategy sync Thursday?",
    classification: "Scheduling Request",
    confidence: "95% Confidence",
    suggestedAction: "Schedule Google Calendar Event",
    draftReply: "Scheduled Google Meet for Thursday at 2:00 PM EST and dispatched calendar invitation to sarah@techstartup.io.",
    outcome: "Google Calendar event created & confirmation invite delivered",
  },
  {
    id: "vendor",
    title: "Vendor Tracking",
    icon: Inbox,
    sender: "Logistics Dispatch (dispatch@parts-co.com)",
    subject: "Shipment #8821 dispatched via FedEx Ground",
    classification: "FYI / Status Update",
    confidence: "99% Confidence",
    suggestedAction: "Acknowledge & Record Tracking",
    draftReply: "Received shipment dispatch note for #8821. Tracking recorded into operational log.",
    outcome: "Logged into Activity Trail · No further action needed",
  },
];

const footerLinks = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "#features" },
      { name: "How it works", href: "#how-it-works" },
      { name: "Security", href: "#security" },
      { name: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Approval Queue", href: "/dashboard/queue" },
      { name: "Activity Log", href: "/dashboard/activity" },
      { name: "Integrations", href: "/dashboard/settings" },
    ],
  },
  {
    title: "Legal & Trust",
    links: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Security Architecture", href: "#security" },
    ],
  },
];

export default function LandingPage() {
  const [activePipelineId, setActivePipelineId] = useState("invoice");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [approvedState, setApprovedState] = useState(false);

  const activeExample =
    pipelineExamples.find((item) => item.id === activePipelineId) ||
    pipelineExamples[0];

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setIsAuthenticated(true);
        }
      });
    } catch {
      // ignore
    }
  }, []);

  const handleSimulatedApprove = () => {
    setApprovedState(true);
    setTimeout(() => {
      setApprovedState(false);
    }, 3500);
  };

  return (
    <>
      {/* ------------------------------ Hero Section ------------------------------ */}
      <section className="relative w-full overflow-hidden">
        {/* Full-width 2D Interactive Ripple Grid Background spanning edge-to-edge */}
        <HeroInteractiveBackground
          gridSize={46}
          movement={0.75}
          force={180}
          strokeColor="rgba(139, 92, 246, 0.16)"
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6 sm:pt-16 sm:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/90 bg-white/90 px-4 py-1.5 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-500/10 backdrop-blur-md transition-all hover:border-violet-300">
            <Sparkles className="size-3.5 text-violet-600 animate-pulse-soft" />
            <span>AI-powered operations, human-approved.</span>
          </div>

          {/* Main headline */}
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-balance sm:text-6xl lg:text-6xl text-foreground">
            Let AI handle the{" "}
            <span className="text-gradient">operational noise.</span>
          </h1>

          {/* Supporting copy */}
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
            AutoOps turns incoming operational emails into ready-to-review
            actions, so your team can move faster without giving up control.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isAuthenticated ? (
              <Button
                asChild
                size="lg"
                className="group shimmer-effect h-12 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-8 text-base font-bold shadow-xl shadow-violet-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-violet-500/35 active:scale-[0.98] text-white"
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4.5 text-white" />
                  Open Dashboard
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1.5" />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="group shimmer-effect h-12 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-8 text-base font-bold shadow-xl shadow-violet-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-violet-500/35 active:scale-[0.98] text-white"
              >
                <Link href="/login">
                  Get Started
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1.5" />
                </Link>
              </Button>
            )}

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-xl border-violet-200 bg-white/90 px-6 text-sm font-semibold hover:bg-violet-50 hover:text-violet-800 text-foreground shadow-xs transition-all"
            >
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>

          {/* Trust statement */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <Lock className="size-3.5 text-violet-600" />
            <span>Human-approved. Always.</span>
            <span className="text-violet-300">·</span>
            <span>Gmail & Google Calendar Ready</span>
          </div>
        </div>

        {/* ----------------- Floating Real Product Visualization ----------------- */}
        <div className="relative z-10 mt-14 overflow-hidden rounded-3xl border border-violet-200/80 bg-white/90 p-4 shadow-2xl shadow-violet-500/15 backdrop-blur-xl sm:p-6">
          {/* Top command bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-violet-100">
            <div className="flex items-center gap-2.5">
              <div className="relative grid size-8 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
                <Bot className="size-4.5" />
                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  AutoOps Command Center
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Operational AI Pipeline · Monitoring Inbound
                </p>
              </div>
            </div>

            {/* Pipeline Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground hidden md:inline">
                Operational Scenario:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {pipelineExamples.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePipelineId(item.id);
                      setApprovedState(false);
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      activePipelineId === item.id
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline Cards Grid */}
          <div className="grid gap-5 pt-5 lg:grid-cols-2">
            {/* Left: Inbound Email Feed */}
            <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-4.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
                  <Inbox className="size-3.5 text-violet-600" /> Inbound Mail Received
                </span>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Verified Ingest
                </span>
              </div>

              <div className="space-y-2 bg-white p-4 rounded-xl border border-violet-100 shadow-xs">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sender
                  </span>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {activeExample.sender}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Subject
                  </span>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {activeExample.subject}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Zap className="size-3 text-violet-600" /> Ingested via Gmail API & Cron
                </span>
                <span>Realtime Supabase Sync</span>
              </div>
            </div>

            {/* Right: AI Intelligence & Approval Queue Action */}
            <div className="space-y-3 rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50/80 via-white to-purple-50/60 p-4.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-violet-600" /> AI Classification & Draft
                </span>
                <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-[11px] font-bold">
                  {activeExample.confidence}
                </Badge>
              </div>

              <div className="space-y-2.5 bg-white p-4 rounded-xl border border-violet-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-violet-900">
                    {activeExample.suggestedAction}
                  </p>
                  <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">
                    {activeExample.classification}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed bg-violet-50/40 p-2.5 rounded-lg border border-violet-100/80">
                  {activeExample.draftReply}
                </p>
              </div>

              {/* Approval Buttons */}
              <div className="pt-1 flex items-center justify-between gap-3">
                {approvedState ? (
                  <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md animate-fade-in">
                    <CheckCircle2 className="size-4" /> {activeExample.outcome}
                  </div>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5 text-violet-600" /> Awaiting approval
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSimulatedApprove}
                        className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-xs font-semibold text-white shadow-md shadow-violet-500/20 hover:scale-105 transition-all"
                      >
                        <Check className="size-3.5" /> Approve & Execute
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

      {/* --------------------------- Operational Workflow ----------------------------- */}
      <section
        id="how-it-works"
        className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6"
      >
        <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-b from-violet-50/80 via-purple-50/30 to-white p-6 shadow-sm sm:p-10">
          <div className="relative mb-8 text-center">
            <Badge variant="outline" className="border-violet-200 bg-violet-100/60 text-violet-700 mb-2">
              End-to-End Execution
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              From inbox to done — in four steps
            </h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-lg mx-auto">
              AutoOps processes operational mail, prepares actions with full context, and waits for your confirmation before executing.
            </p>
          </div>
          <WorkflowDiagram />
        </div>
      </section>

      {/* ---------------------------- Features Grid ---------------------------- */}
      <section
        id="features"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6"
      >
        <div className="mb-12 text-center">
          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 mb-3">
            Platform Capabilities
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Built for{" "}
            <span className="text-gradient">small, fast-moving teams</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base leading-relaxed">
            Solo founders, operators, and lean teams — all of the speed of an AI operations assistant, with zero loss of control.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              className="group glass-card relative overflow-hidden border-violet-100/90 hover:border-violet-300 transition-all duration-300"
            >
              <div className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-violet-200/40 blur-2xl transition-opacity group-hover:opacity-100" />
              <CardContent className="relative space-y-4 pt-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="size-6" strokeWidth={2} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="border border-violet-100 bg-violet-50 text-violet-700 text-[11px]"
                >
                  {feature.tag}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------------------- Security Section ---------------------------- */}
      <section
        id="security"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6"
      >
        <div className="relative overflow-hidden rounded-3xl border border-violet-200/80 bg-white/90 p-8 shadow-xl shadow-violet-500/5 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                Security & Isolation
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Enterprise security with strict human oversight.
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                AutoOps never executes unapproved side-effects. All database operations are protected with PostgreSQL Row-Level Security, and Google tokens are isolated per tenant.
              </p>

              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-foreground">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Human-in-the-loop:</strong> No automated email sending without explicit approval</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Multi-tenant isolation:</strong> Row-Level Security ensures only you see your data</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Granular OAuth scopes:</strong> Minimal permissions for Gmail and Calendar execution</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span><strong>Immutable activity trail:</strong> Every AI suggestion, edit, approval, and execution is logged</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-purple-50/50 to-white p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
                  <Shield className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Security Verified</p>
                  <p className="text-xs text-muted-foreground">Postgres RLS · AES Scopes · Timing-Safe Cron</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every webhook and cron ingestion verifies cryptographic tokens before processing. Your data stays in your Supabase instance, protected by database-level policies.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                  RLS Enforced
                </Badge>
                <Badge className="bg-violet-50 text-violet-700 border-violet-200 text-xs font-semibold">
                  OAuth 2.0 PKCE
                </Badge>
                <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold">
                  Zero Data Leakage
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- Bottom CTA Banner ------------------------------ */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-6 py-16 text-center shadow-2xl shadow-violet-500/30 sm:px-12">
          <div className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-24 size-64 rounded-full bg-fuchsia-300/25 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to reclaim your operational workflow?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-violet-100 text-sm sm:text-base">
              Connect your workspace and experience intelligent operational automation with complete human control.
            </p>
            <Button
              asChild
              size="lg"
              className="group mt-8 h-12 rounded-xl bg-white px-8 text-base font-bold text-violet-700 shadow-xl transition-all duration-300 hover:bg-violet-50 hover:scale-105 active:scale-95"
            >
              <Link href={isAuthenticated ? "/dashboard" : "/login"}>
                {isAuthenticated ? "Open Dashboard" : "Get Started with AutoOps"}
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------ Footer ---------------------------- */}
      <footer className="border-t border-violet-100/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
            <div className="space-y-3">
              <Logo href="/" />
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                AI-powered operations, human-approved.
              </p>
            </div>
            {footerLinks.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-bold text-foreground">
                  {group.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {group.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-violet-700 text-sm font-medium transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-muted-foreground mt-10 flex flex-col items-center justify-between gap-3 border-t border-violet-100/60 pt-6 text-xs sm:flex-row">
            <p>
              © {new Date().getFullYear()} AutoOps. All rights reserved.
            </p>
            <p>AI-powered operations, human-approved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
