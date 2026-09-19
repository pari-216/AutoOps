import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, FileText } from "lucide-react";

import { LEGAL_CONFIG } from "@/lib/legal";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of AutoOps.",
};

export default function TermsOfServicePage() {
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
          Terms & Agreement
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Terms of Service
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Terms governing your access to and use of AutoOps.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
          <span><strong>Last updated:</strong> {LEGAL_CONFIG.lastUpdated}</span>
          <span>·</span>
          <span><strong>Effective date:</strong> {LEGAL_CONFIG.effectiveDate}</span>
          <span>·</span>
          <span><strong>Terms Version:</strong> {LEGAL_CONFIG.currentTermsVersion}</span>
        </div>
      </div>

      {/* Terms Content */}
      <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground">
        {/* Section 1: Acceptance */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and {LEGAL_CONFIG.companyLegalName} (&quot;AutoOps,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By creating an account, accessing, or using AutoOps, you agree to be bound by these Terms and our <Link href="/privacy" className="text-violet-600 font-semibold hover:underline">Privacy Policy</Link>. If you do not agree to these Terms, you may not use the service.
          </p>
        </section>

        {/* Section 2: Description of Service */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoOps is an AI agent orchestration platform for operational workflows. AutoOps monitors incoming operational messages, analyzes message intent using artificial intelligence, drafts recommended replies or calendar actions, and presents these recommendations in an Approval Queue for human review before execution.
          </p>
        </section>

        {/* Section 3: Accounts and Registration */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">3. Accounts and Registration</h2>
          <p className="text-muted-foreground leading-relaxed">
            You must provide accurate and complete information when creating an AutoOps account. You are responsible for maintaining the confidentiality of your authentication credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized access to your account.
          </p>
        </section>

        {/* Section 4: Google Integrations & Permissions */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">4. Google Integrations and Permissions</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you connect a Google account to AutoOps, you grant AutoOps permission to access your Gmail and Google Calendar strictly within the OAuth scopes you authorize (including reading operational messages, sending approved replies, and scheduling calendar events). You may revoke this connection at any time from your AutoOps Settings or directly from your Google Account security permissions.
          </p>
        </section>

        {/* Section 5: AI-Generated Content & Automation Disclaimer */}
        <section className="space-y-4 rounded-2xl border border-violet-200/90 bg-violet-50/40 p-6">
          <div className="flex items-center gap-2 text-violet-800">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <h2 className="text-lg font-bold">5. AI-Generated Content & Automation Terms</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">
            AutoOps utilizes large language model artificial intelligence to classify emails and draft recommended responses. You acknowledge and agree to the following conditions:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-xs sm:text-sm text-muted-foreground">
            <li><strong>Advisory Nature:</strong> AI suggestions, classifications, confidence scores, and drafted replies are advisory only and may contain errors, omissions, or inaccuracies.</li>
            <li><strong>Mandatory Human Review:</strong> You are solely responsible for reviewing, verifying the accuracy of, and approving all drafted replies and actions before dispatch.</li>
            <li><strong>No High-Stakes Usage:</strong> AutoOps is not designed or intended for emergency response, medical, legal advice, high-stakes financial transactions, safety-critical systems, or life-safety applications. You agree not to rely on AutoOps for high-stakes operational decisions without independent verification.</li>
          </ul>
        </section>

        {/* Section 6: Human Approval and User Responsibility */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">6. Human Approval & Operational Responsibility</h2>
          <p className="text-muted-foreground leading-relaxed">
            By design, AutoOps does not execute outbound emails or calendar modifications without your explicit approval via the Approval Queue. When you click &quot;Approve&quot; or &quot;Edit &amp; Approve,&quot; you represent that you have reviewed the action and authorize AutoOps to execute the action on your behalf through your connected integration.
          </p>
        </section>

        {/* Section 7: Acceptable Use */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">7. Acceptable Use Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree not to use AutoOps:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>To transmit unsolicited bulk email (spam), phishing attempts, malware, or unlawful communications.</li>
            <li>To violate the intellectual property, privacy, or legal rights of any third party.</li>
            <li>To attempt to circumvent authentication, exploit system vulnerabilities, or reverse-engineer AutoOps.</li>
            <li>To violate Google API Services Terms, Supabase Terms, or applicable laws and regulations.</li>
          </ul>
        </section>

        {/* Section 8: User Content and Data */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">8. User Content and Data Ownership</h2>
          <p className="text-muted-foreground leading-relaxed">
            You retain full ownership of all data, emails, text, and operational records processed through your AutoOps account. You grant AutoOps a limited, revocable license to process your content solely to deliver the features and services requested by you.
          </p>
        </section>

        {/* Section 9: Third-Party Services */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">9. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoOps relies on third-party infrastructure including Google LLC, Supabase, Inc., Groq, Inc., and Vercel Inc. Your use of third-party integrations is subject to the respective terms and privacy policies of those providers. AutoOps is not responsible for the availability or service levels of third-party providers.
          </p>
        </section>

        {/* Section 10: Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">10. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoOps, including its software, visual design, user interface, brand assets, logos, and documentation, is the exclusive intellectual property of {LEGAL_CONFIG.companyLegalName}. You may not copy, modify, distribute, or reverse-engineer any portion of the service without prior written authorization.
          </p>
        </section>

        {/* Section 11: Service Availability & Disclaimers */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">11. Service Availability &amp; Disclaimers</h2>
          <p className="text-muted-foreground leading-relaxed">
            AUTOOPS IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED, ERROR-FREE OPERATION OR THAT INCOMING EMAILS WILL BE PROCESSED WITHOUT DELAY.
          </p>
        </section>

        {/* Section 12: Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">12. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL AUTOOPS, ITS DIRECTORS, EMPLOYEES, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITY, OR GOODWILL ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
        </section>

        {/* Section 13: Termination */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">13. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may terminate your account at any time by disconnecting your integrations and requesting account deletion. We reserve the right to suspend or terminate accounts that violate these Terms or present security risks to our platform.
          </p>
        </section>

        {/* Section 14: Governing Law */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">14. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of {LEGAL_CONFIG.governingJurisdiction}, without regard to its conflict of law provisions.
          </p>
        </section>

        {/* Section 15: Contact Us */}
        <section className="space-y-3 rounded-2xl border border-violet-100 bg-white p-6 shadow-xs">
          <h2 className="text-xl font-bold text-foreground">15. Contact Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions concerning these Terms of Service, please contact:
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
