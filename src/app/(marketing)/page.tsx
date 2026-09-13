"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Inbox,
  Lock,
  Play,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";

import { WorkflowDiagram } from "@/components/workflow-diagram";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAutoOps } from "@/context/autoops-context";

const features = [
  {
    icon: Inbox,
    title: "AI Email Intelligence",
    description:
      "AutoOps reads incoming operational emails, understands intent, and drafts the right action — invoices, scheduling, follow-ups, and more.",
    tag: "Understands context",
  },
  {
    icon: CheckCircle2,
    title: "Human Approval",
    description:
      "Nothing happens until you say so. Every suggestion lands in your approval queue for a one-tap review before anything is sent.",
    tag: "You stay in control",
  },
  {
    icon: Sparkles,
    title: "Smart Automation",
    description:
      "Approved actions run themselves — replies sent, events scheduled, tasks routed — while every step is recorded in your activity log.",
    tag: "Runs on autopilot",
  },
];

const heroDemos = [
  {
    label: "Invoice Request",
    sender: "Acme Corp Billing",
    email: "billing@acmecorp.com",
    subject: "Please send Invoice #1042 for web project",
    intent: "Generate & Dispatch Invoice",
    confidence: "98% Confidence",
    draft: "Attached is Invoice #1042 ($2,450.00). Net-30 payment link included.",
  },
  {
    label: "Meeting Request",
    sender: "Sarah Chen (TechStartup)",
    email: "sarah@techstartup.io",
    subject: "Free for 30-min strategy sync Thursday?",
    intent: "Calendar Event & RSVP",
    confidence: "95% Confidence",
    draft: "Schedule Google Calendar event for Thursday 2:00 PM EST & send invite.",
  },
  {
    label: "Vendor Status",
    sender: "Parts Co Logistics",
    email: "dispatch@parts-co.com",
    subject: "Shipment #8821 dispatched via FedEx",
    intent: "Update Inventory CRM",
    confidence: "99% Confidence",
    draft: "Update CRM order #8821 status to 'Shipped' & record tracking #.",
  },
];

const footerLinks: { title: string; links: { name: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "#features" },
      { name: "How it works", href: "#how-it-works" },
      { name: "Live Demo", href: "#demo" },
      { name: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Security", href: "#" },
    ],
  },
];

export default function LandingPage() {
  const [selectedDemoIndex, setSelectedDemoIndex] = useState(0);
  const [demoApproved, setDemoApproved] = useState(false);
  const { simulateIncomingEmail } = useAutoOps();

  const activeDemo = heroDemos[selectedDemoIndex];

  const handleDemoApprove = () => {
    setDemoApproved(true);
    setTimeout(() => {
      setDemoApproved(false);
    }, 3000);
  };

  return (
    <>
      {/* ------------------------------ Hero ------------------------------ */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="animate-fade-up border-violet-200 bg-violet-50/90 px-3.5 py-1 text-violet-700 shadow-sm transition-transform hover:scale-105"
          >
            <Sparkles className="size-3.5 text-violet-600 animate-pulse-soft" />
            AutoOps Phase 1 · Interactive Preview
          </Badge>

          <h1
            className="animate-fade-up mt-6 text-4xl font-extrabold tracking-tight text-balance sm:text-6xl"
            style={{ animationDelay: "100ms" }}
          >
            Let AI handle the{" "}
            <span className="text-gradient">operational noise.</span>
          </h1>

          <p
            className="animate-fade-up text-muted-foreground mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            AutoOps watches your incoming operational emails, suggests the right
            actions, and waits for your approval — so nothing is ever sent,
            scheduled, or decided without you.
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row"
            style={{ animationDelay: "300ms" }}
          >
            <Button
              asChild
              size="lg"
              className="group shimmer-effect h-12 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-7 text-base shadow-xl shadow-violet-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-violet-500/35 active:scale-[0.98]"
            >
              <Link href="/dashboard">
                Open Dashboard Demo
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm font-medium">
              <Lock className="size-3.5 text-violet-600" />
              Human-approved. Always.
            </span>
          </div>
        </div>

        {/* Live AI Demo Playground */}
        <div
          id="demo"
          className="animate-fade-up mt-14 rounded-3xl border border-violet-200/80 bg-white/90 p-4 shadow-xl shadow-violet-500/10 backdrop-blur-xl sm:p-6 scroll-mt-24"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-violet-100">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-violet-600 text-white shadow-sm">
                <Bot className="size-4" />
              </div>
              <p className="text-sm font-bold text-foreground">
                Interactive AI Operational Simulator
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Select Example:</span>
              <div className="flex flex-wrap gap-1.5">
                {heroDemos.map((demo, idx) => (
                  <button
                    key={demo.label}
                    onClick={() => {
                      setSelectedDemoIndex(idx);
                      setDemoApproved(false);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      selectedDemoIndex === idx
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                    }`}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 pt-5 md:grid-cols-2">
            {/* Left: Email input mock */}
            <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
                  <Inbox className="size-3.5" /> Incoming Mail
                </span>
                <span className="text-[11px] text-muted-foreground">Just received</span>
              </div>
              <div className="space-y-1 bg-white p-3.5 rounded-xl border border-violet-100 shadow-xs">
                <p className="text-xs font-semibold text-foreground">
                  From: <span className="font-normal text-muted-foreground">{activeDemo.sender} ({activeDemo.email})</span>
                </p>
                <p className="text-xs font-semibold text-foreground">
                  Subject: <span className="font-normal text-muted-foreground">{activeDemo.subject}</span>
                </p>
              </div>
              <div className="flex justify-end">
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
                  <Zap className="size-3 text-emerald-600" /> AI Scanned
                </Badge>
              </div>
            </div>

            {/* Right: AI Suggestion & Human Approval */}
            <div className="space-y-3 rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50/80 via-white to-purple-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> AI Suggestion Card
                </span>
                <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-[11px]">
                  {activeDemo.confidence}
                </Badge>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-violet-200 space-y-2 shadow-xs">
                <p className="text-xs font-bold text-violet-900">{activeDemo.intent}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeDemo.draft}
                </p>
              </div>

              <div className="pt-1 flex items-center justify-between gap-3">
                {demoApproved ? (
                  <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md animate-fade-in">
                    <CheckCircle2 className="size-4" /> Action Executed & Logged!
                  </div>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock3 className="size-3.5 text-violet-500" /> Awaiting your decision
                    </span>
                    <Button
                      size="sm"
                      onClick={handleDemoApprove}
                      className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-xs font-semibold shadow-md shadow-violet-500/20 hover:scale-105 transition-transform"
                    >
                      <CheckCircle2 className="size-3.5" /> One-Tap Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- Workflow ----------------------------- */}
      <section
        id="how-it-works"
        className="animate-fade-up relative mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6"
        style={{ animationDelay: "350ms" }}
      >
        <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-b from-violet-50/80 via-purple-50/40 to-white p-6 shadow-sm sm:p-10">
          <div className="relative mb-8 text-center">
            <Badge variant="outline" className="border-violet-200 bg-violet-100/50 text-violet-700 mb-2">
              Simple 4-Step Pipeline
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              From inbox to done — in four steps
            </h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
              Click any step below to explore how AutoOps handles operational tasks automatically.
            </p>
          </div>
          <WorkflowDiagram />
        </div>
      </section>

      {/* ---------------------------- Features ---------------------------- */}
      <section
        id="features"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6"
      >
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Built for{" "}
            <span className="text-gradient">small, fast-moving teams</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base">
            Freelancers, solo founders, and lean teams — all of the leverage of
            an operations hire, with none of the loss of control.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              className="group glass-card relative overflow-hidden border-violet-100/80"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-violet-200/50 blur-2xl transition-opacity group-hover:opacity-100" />
              <CardContent className="relative space-y-4 pt-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <feature.icon className="size-6" strokeWidth={2} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-foreground">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="border border-violet-100 bg-violet-50 text-violet-700"
                >
                  {feature.tag}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------- CTA ------------------------------ */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        <div className="animate-fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-6 py-16 text-center shadow-2xl shadow-violet-500/30 sm:px-12">
          <div className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-24 size-64 rounded-full bg-fuchsia-300/25 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to reclaim your operational workflow?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-violet-100 text-sm sm:text-base">
              Try the interactive AutoOps dashboard and watch how easy human-in-the-loop operational automation can be.
            </p>
            <Button
              asChild
              size="lg"
              className="group mt-8 h-12 rounded-xl bg-white px-8 text-base font-bold text-violet-700 shadow-xl transition-all duration-300 hover:bg-violet-50 hover:scale-105 active:scale-95"
            >
              <Link href="/dashboard">
                Launch Dashboard Demo
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------ Footer ---------------------------- */}
      <footer className="border-t border-violet-100/60 bg-white/80 backdrop-blur-md">
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
                      {link.href.startsWith("/") ? (
                        <Link
                          href={link.href}
                          className="text-muted-foreground hover:text-violet-700 text-sm font-medium transition-colors"
                        >
                          {link.name}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-muted-foreground hover:text-violet-700 text-sm font-medium transition-colors"
                        >
                          {link.name}
                        </a>
                      )}
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
