"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  Inbox,
  type LucideIcon,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface WorkflowStep {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
  previewData: {
    label: string;
    content: string;
    subtext: string;
  };
}

const steps: WorkflowStep[] = [
  {
    id: 1,
    icon: Inbox,
    title: "1. Email Received",
    description: "Operational mail lands in your inbox",
    badge: "Inbox Monitor",
    previewData: {
      label: "Incoming Email",
      content: 'From: billing@acmecorp.com — "Need invoice #1042 for $2,450."',
      subtext: "AutoOps reads intent, parses attachments & extracts context automatically.",
    },
  },
  {
    id: 2,
    icon: Bot,
    title: "2. AI Agent Drafts",
    description: "AutoOps drafts the exact right action",
    badge: "AI Intelligence",
    previewData: {
      label: "AI Processing (98% Confidence)",
      content: 'Drafted Invoice PDF #1042 + automated email response ready.',
      subtext: "Zero manual data entry. Formats invoice according to Acme Corp net-30 terms.",
    },
  },
  {
    id: 3,
    icon: CheckCircle2,
    title: "3. Human Approval",
    description: "You review and approve in one tap",
    badge: "Human in the Loop",
    previewData: {
      label: "Approval Queue Alert",
      content: 'One-tap approve on Mobile or Web Dashboard. No accidental sends.',
      subtext: "You maintain 100% control over outgoing emails, calendars, and records.",
    },
  },
  {
    id: 4,
    icon: Send,
    title: "4. Executed Action",
    description: "The approved step is sent & logged",
    badge: "Automated Dispatch",
    previewData: {
      label: "Execution Completed",
      content: "Email sent via Gmail API & record appended to Activity Log.",
      subtext: "Complete audit trail recorded. System ready for next operational email.",
    },
  },
];

/**
 * Interactive Email → AI Agent → Human Approval → Action visualization.
 */
export function WorkflowDiagram({ className }: { className?: string }) {
  const [activeStep, setActiveStep] = useState<number>(2);

  const currentStep = steps.find((s) => s.id === activeStep) || steps[1];

  return (
    <div className={cn("space-y-8", className)}>
      <div className="grid grid-cols-1 items-stretch justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {steps.map((step, i) => {
          const isSelected = activeStep === step.id;

          return (
            <div key={step.title} className="contents">
              {/* Step card */}
              <button
                type="button"
                onClick={() => setActiveStep(step.id)}
                onMouseEnter={() => setActiveStep(step.id)}
                className={cn(
                  "animate-fade-up group relative flex w-full max-w-xs cursor-pointer text-left items-start gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur transition-all duration-300 lg:flex-col lg:items-center lg:gap-3 lg:text-center",
                  isSelected
                    ? "border-violet-400 bg-white ring-2 ring-violet-400/40 shadow-xl shadow-violet-500/15 -translate-y-1.5"
                    : "border-violet-100 bg-white/80 hover:-translate-y-1 hover:border-violet-300 hover:bg-white hover:shadow-md hover:shadow-violet-500/10"
                )}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-xl transition-all duration-300",
                    isSelected
                      ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30 scale-110"
                      : "bg-violet-50 text-violet-600 group-hover:bg-violet-100 group-hover:scale-105"
                  )}
                >
                  <step.icon className="size-5.5" strokeWidth={2} />
                </div>
                <div className="lg:space-y-1">
                  <div className="flex items-center gap-2 lg:justify-center">
                    <p className="text-sm font-bold text-foreground">
                      {step.title}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {step.description}
                  </p>
                </div>
                <Badge
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "mt-1 text-[11px] transition-colors",
                    isSelected
                      ? "bg-violet-600 text-white"
                      : "border-violet-200 text-violet-700 bg-violet-50/50"
                  )}
                >
                  {step.badge}
                </Badge>
              </button>

              {/* Connector between steps */}
              {i < steps.length - 1 && (
                <div
                  className="animate-fade-in hidden items-center justify-center self-center lg:flex"
                  style={{ animationDelay: `${i * 120 + 80}ms` }}
                >
                  <div className="relative flex items-center justify-center">
                    <svg
                      width="56"
                      height="24"
                      viewBox="0 0 56 24"
                      fill="none"
                      aria-hidden="true"
                      className={cn(
                        "transition-colors duration-300",
                        activeStep > i ? "text-violet-500" : "text-violet-200"
                      )}
                    >
                      <line
                        x1="0"
                        y1="12"
                        x2="56"
                        y2="12"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="6 6"
                        className="animate-dash-flow"
                      />
                      <path
                        d="M48 6l8 6-8 6"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Step Detailed Interactive Preview */}
      <div className="animate-fade-in relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-900 via-indigo-900 to-purple-950 p-5 sm:p-6 text-white shadow-xl shadow-violet-950/20">
        <div className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-violet-300" />
              <span className="text-xs font-semibold tracking-wider text-violet-300 uppercase">
                {currentStep.previewData.label}
              </span>
            </div>
            <p className="text-base font-semibold text-white leading-snug">
              {currentStep.previewData.content}
            </p>
            <p className="text-xs text-violet-200/80 leading-relaxed">
              {currentStep.previewData.subtext}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-violet-500/30 text-violet-200 border-violet-400/40 px-3 py-1">
              Step {currentStep.id} of 4 Active
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
