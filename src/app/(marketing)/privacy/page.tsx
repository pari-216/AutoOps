import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Mail, Database, Bot, Lock, Calendar, Server, CheckCircle2 } from "lucide-react";

import { LEGAL_CONFIG } from "@/lib/legal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how AutoOps collects, uses, stores, and protects your information.",
};

const thirdPartyServices = [
  {
    name: "Google LLC",
    purpose: "User authentication, Gmail inbound monitoring, Gmail reply dispatch, and Google Calendar scheduling.",
    dataShared: "OAuth tokens, email headers/body text of operational messages, calendar event metadata.",
  },
  {
    name: "Supabase, Inc.",
    purpose: "PostgreSQL database hosting, user session authentication, and Realtime WebSocket subscriptions.",
    dataShared: "User profile identifiers, encrypted integration records, inbound operational events, activity logs.",
  },
  {
    name: "Groq, Inc.",
    purpose: "AI reasoning engine for operational email classification and response draft generation.",
    dataShared: "Operational email subject and body text for classification and drafting.",
  },
  {
    name: "Vercel Inc.",
    purpose: "Web application hosting, serverless API execution, and periodic cron scheduling for inbox synchronization.",
    dataShared: "HTTP request metadata, server execution logs.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Back button */}
      <div className="mb-8">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-violet-50"
        >
          <ArrowLeft className="size-4 text-violet-600" />
          Back to AutoOps
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-4 border-b border-violet-100/80 pb-8">
        <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
          Legal & Privacy
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          How AutoOps collects, uses, stores, and protects your information.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
          <span><strong>Last updated:</strong> {LEGAL_CONFIG.lastUpdated}</span>
          <span>·</span>
          <span><strong>Effective date:</strong> {LEGAL_CONFIG.effectiveDate}</span>
          <span>·</span>
          <span><strong>Policy Version:</strong> {LEGAL_CONFIG.currentPrivacyVersion}</span>
        </div>
      </div>

      {/* Policy Content */}
      <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground">
        {/* Section 1: Overview */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">1. Overview</h2>
          <p className="text-muted-foreground leading-relaxed">
            {LEGAL_CONFIG.appName} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), operated by {LEGAL_CONFIG.companyLegalName}, provides an AI-assisted operational platform that monitors incoming operational emails, suggests structured actions, and requires human approval before executing any outbound communication or calendar action.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This Privacy Policy explains how we collect, use, store, share, and protect information when you access or use AutoOps. By using AutoOps, you acknowledge the collection and use of information in accordance with this policy.
          </p>
        </section>

        {/* Section 2: Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">2. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">
            We collect information you provide directly, as well as operational data authorized through third-party integrations:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li><strong>Account Information:</strong> Email address, encrypted authentication credentials, and user profile identifiers created during signup or login.</li>
            <li><strong>Inbound Operational Events:</strong> Email sender addresses, sender names, subjects, message body text, message timestamps, and message/thread identifiers received from connected email accounts.</li>
            <li><strong>AI-Generated Suggestions:</strong> Classifications (e.g., urgent, needs reply, fyi, spam-like), confidence scores, suggested action types, drafted replies, and reasoning notes generated by our AI agent.</li>
            <li><strong>Approval and Decision Records:</strong> Human review decisions (approved, edited, rejected), timestamp of decisions, and human-edited draft content.</li>
            <li><strong>Audit & Activity Logs:</strong> Detailed event logs recording timestamps, status transitions, API execution results, and operational actions taken.</li>
          </ul>
        </section>

        {/* Section 3: Google Account & Google User Data */}
        <section className="space-y-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-6">
          <div className="flex items-center gap-2 text-violet-800">
            <ShieldCheck className="size-5 text-violet-600" />
            <h2 className="text-xl font-bold">3. Google Account & Google User Data</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            When you connect your Google Account to AutoOps, we request specific OAuth permissions (scopes) to enable the service. We only request the minimum permissions necessary for AutoOps to function:
          </p>
          <div className="space-y-2.5">
            <div className="rounded-xl border border-violet-100 bg-white p-3.5 shadow-xs">
              <p className="text-xs font-bold text-foreground">Gmail Read-Only (<code className="text-violet-600">https://www.googleapis.com/auth/gmail.readonly</code>)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Used to fetch recent operational emails, read sender and subject metadata, and ingest email content into your private AutoOps workspace for AI analysis.</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white p-3.5 shadow-xs">
              <p className="text-xs font-bold text-foreground">Gmail Send (<code className="text-violet-600">https://www.googleapis.com/auth/gmail.send</code>)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Used exclusively to dispatch email replies that you have explicitly reviewed, approved, or edited in the Approval Queue.</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white p-3.5 shadow-xs">
              <p className="text-xs font-bold text-foreground">Google Calendar Events (<code className="text-violet-600">https://www.googleapis.com/auth/calendar.events</code>)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Used exclusively to create or update Google Calendar events that you have explicitly approved.</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white p-3.5 shadow-xs">
              <p className="text-xs font-bold text-foreground">User Profile & Email (<code className="text-violet-600">userinfo.email</code>, <code className="text-violet-600">userinfo.profile</code>)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Used to identify and authenticate your connected Google account in AutoOps.</p>
            </div>
          </div>
        </section>

        {/* Section 4: Google User Data Limited Use Disclosure */}
        <section className="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-6">
          <h2 className="text-lg font-bold text-amber-900">4. Google User Data Limited Use Disclosure</h2>
          <p className="text-amber-900/90 text-xs sm:text-sm leading-relaxed">
            AutoOps&apos;s use and transfer to any other app of information received from Google APIs adheres to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-xs sm:text-sm text-amber-900/90">
            <li>We only use Google user data to provide and improve user-facing features that are prominent in the AutoOps user interface.</li>
            <li>We do not transfer Google user data to third parties, except as necessary to provide or improve these features, comply with applicable law, or as part of a merger or acquisition with explicit notice.</li>
            <li>We do not use or transfer Google user data for serving advertisements, including retargeting, personalized, or interest-based advertising.</li>
            <li>We do not use Google user data to train, retrain, or fine-tune generalized artificial intelligence (AI) or machine learning (ML) models.</li>
            <li>Humans do not read your Google user data unless you have given explicit permission for specific messages, it is necessary for security purposes (such as investigating abuse), to comply with applicable law, or where data is aggregated and anonymized for internal operations.</li>
          </ul>
        </section>

        {/* Section 5: How We Use Information */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">5. How We Use Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use the information we collect strictly to deliver, maintain, and support AutoOps services:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>To authenticate users and secure account sessions.</li>
            <li>To synchronize and parse operational emails authorized through your connected account.</li>
            <li>To analyze operational intent and generate structured draft responses and calendar actions for your review.</li>
            <li>To dispatch approved outbound emails and calendar events via the official Google APIs upon your explicit approval.</li>
            <li>To maintain an immutable operational audit trail in your Activity Log.</li>
            <li>To prevent duplicate actions, race conditions, and unauthorized access.</li>
          </ul>
        </section>

        {/* Section 6: AI Processing Disclosure */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">6. AI Processing & Model Usage</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoOps utilizes artificial intelligence (via Groq API) to process operational messages:
          </p>
          <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-xs space-y-2">
            <p className="text-xs font-semibold text-foreground">Operational AI Processing Pipeline:</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              1. <strong>Email Received:</strong> Operational message text is sanitized and transmitted securely to our AI reasoning service.<br />
              2. <strong>Classification:</strong> The model evaluates operational context, urgency, and recommended action type.<br />
              3. <strong>Draft Generation:</strong> The model drafts an action or reply in structured JSON format.<br />
              4. <strong>Human Review:</strong> The draft lands in your Approval Queue. <em>No action is taken automatically without human review.</em><br />
              5. <strong>Execution & Audit:</strong> Upon your approval, the action is dispatched and recorded.
            </p>
          </div>
          <p className="text-muted-foreground leading-relaxed text-xs">
            <em>Important Notice:</em> AI suggestions are advisory in nature. AutoOps does not guarantee 100% accuracy of AI classifications or drafted text. You retain sole responsibility for reviewing and approving all outgoing communications.
          </p>
        </section>

        {/* Section 7 & 8: Gmail and Calendar Data */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">7. Gmail and Google Calendar Data</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoOps only accesses message threads necessary to process operational workflows. We do not access, scan, or store emails from folders or accounts you have not explicitly authorized. Calendar access is limited to creating and modifying events designated during operational workflows.
          </p>
        </section>

        {/* Section 9: How Human Approval Works */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">8. How Human Approval Works</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoOps enforces a strict human-in-the-loop guarantee. Every AI recommendation remains in a <code className="text-violet-600">pending</code> status in your private Approval Queue until you explicitly take action:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li><strong>Approve:</strong> Authorizes AutoOps to dispatch the drafted action via Google API.</li>
            <li><strong>Edit & Approve:</strong> Allows you to customize the drafted response before dispatching.</li>
            <li><strong>Reject:</strong> Marks the recommendation as rejected without executing any outbound communication.</li>
          </ul>
        </section>

        {/* Section 10: Third-Party Services */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">9. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            We engage carefully selected third-party service providers to support our infrastructure:
          </p>
          <div className="overflow-hidden rounded-xl border border-violet-100 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-violet-100 bg-violet-50/60 font-semibold text-violet-900">
                  <tr>
                    <th className="p-3">Service</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Data Handled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-100/60 text-muted-foreground">
                  {thirdPartyServices.map((svc) => (
                    <tr key={svc.name}>
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">{svc.name}</td>
                      <td className="p-3">{svc.purpose}</td>
                      <td className="p-3">{svc.dataShared}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 11: Data Storage & Security */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">10. Data Storage & Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoOps implements multi-layered security controls to protect your data:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li><strong>Row-Level Security (RLS):</strong> PostgreSQL database policies strictly isolate every table so users can only access their own data.</li>
            <li><strong>Server-Side Secret Isolation:</strong> OAuth access and refresh tokens, API keys, and service secrets are stored securely and never transmitted to client browsers.</li>
            <li><strong>Timing-Safe Cron Validation:</strong> Background cron ingestion endpoints require cryptographically verified bearer tokens.</li>
            <li><strong>Encrypted Transport:</strong> All data in transit is encrypted using Transport Layer Security (TLS/HTTPS).</li>
          </ul>
        </section>

        {/* Section 12: Data Retention */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">11. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoOps retains operational records, activity logs, and inbound events for as long as reasonably necessary to provide the service, maintain audit history, and support account functionality, unless deletion is requested by you or a different retention period is required by applicable law.
          </p>
        </section>

        {/* Section 13: Disconnection & Data Deletion */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">12. Google Account Disconnection & Data Deletion</h2>
          <p className="text-muted-foreground leading-relaxed">
            You maintain full control over your connected accounts and stored data:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li><strong>Disconnecting Google:</strong> You can disconnect your Google Account at any time from the <Link href="/dashboard/settings" className="text-violet-600 font-semibold hover:underline">Settings page</Link>. Disconnecting immediately revokes active synchronization and clears active tokens.</li>
            <li><strong>Account & Data Deletion:</strong> To request permanent deletion of your AutoOps account and associated data records, please email us at <code className="text-violet-600 font-semibold">{LEGAL_CONFIG.contactEmail}</code>. Deletion requests are processed promptly upon identity verification.</li>
          </ul>
        </section>

        {/* Section 14: Children's Privacy */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">13. Children&apos;s Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoOps is intended for business and commercial operations and is not directed to individuals under the age of 18. We do not knowingly collect personal information from children.
          </p>
        </section>

        {/* Section 15: Policy Updates */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">14. Changes to This Privacy Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our service or legal requirements. When updates are published, we will revise the &quot;Last updated&quot; date and update the policy version.
          </p>
        </section>

        {/* Section 16: Contact Us */}
        <section className="space-y-3 rounded-2xl border border-violet-100 bg-white p-6 shadow-xs">
          <h2 className="text-xl font-bold text-foreground">15. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions, privacy inquiries, or wish to request data deletion, please contact our team:
          </p>
          <div className="space-y-1 text-xs text-muted-foreground pt-1">
            <p><strong>Entity:</strong> {LEGAL_CONFIG.companyLegalName}</p>
            <p><strong>Email:</strong> <a href={`mailto:${LEGAL_CONFIG.contactEmail}`} className="text-violet-600 font-semibold hover:underline">{LEGAL_CONFIG.contactEmail}</a></p>
            <p><strong>Address:</strong> {LEGAL_CONFIG.businessAddress}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
