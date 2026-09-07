import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Security & Compliance",
  description:
    "How Loopinglive protects data in transit and at rest, who we share it with, and where our SOC2 readiness stands.",
};

const UPDATED = "31 August 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "encryption",
    heading: "Encryption",
    body: (
      <ul>
        <li>Every connection is served over HTTPS with TLS 1.3.</li>
        <li>Data at rest is encrypted by our database provider (Supabase, on Postgres).</li>
        <li>
          Passwords are hashed, never stored in readable form. API keys and
          webhook signing secrets are stored as hashes — a leak of the database
          does not expose usable credentials.
        </li>
        <li>Payment card details go directly to Stripe and never touch our servers.</li>
      </ul>
    ),
  },
  {
    id: "access-control",
    heading: "Access control",
    body: (
      <ul>
        <li>Row-level security on the database, so one account cannot read another&rsquo;s data by design, not just by application logic.</li>
        <li>Every webinar-scoped action checks real ownership — direct or via a team role — not just who is signed in.</li>
        <li>Two-factor authentication (TOTP) is available and enforceable for administrative accounts.</li>
        <li>Single sign-on (SAML 2.0) is available on the Enterprise plan for teams that want to centralise identity through Okta, Azure AD, or another SAML 2.0 identity provider.</li>
      </ul>
    ),
  },
  {
    id: "audit",
    heading: "Audit logging",
    body: (
      <p>
        Significant actions — creating or deleting a webinar, changing a team
        member&rsquo;s role, exporting or deleting data, adding a webhook — are
        recorded with who did it, when, and from what IP address. Audit entries
        are immutable: nobody, including us, can edit or delete one. Team owners
        can review their team&rsquo;s log at any time in Settings → Security.
      </p>
    ),
  },
  {
    id: "availability",
    heading: "Availability",
    body: (
      <ul>
        <li>Uptime and error-rate monitoring across the platform, with alerting on regressions.</li>
        <li>Automated daily database backups with point-in-time recovery.</li>
        <li>Hosted on Vercel&rsquo;s edge network with automatic scaling.</li>
      </ul>
    ),
  },
  {
    id: "soc2",
    heading: "SOC2 readiness",
    body: (
      <p>
        We are preparing for SOC2 Type II and are not yet certified. Evidence
        collection against the Security, Availability, and Confidentiality
        trust service criteria — access control, encryption, audit logging,
        uptime, backup completion — runs continuously today, ahead of engaging
        an external auditor. If your organisation needs our current security
        documentation for a vendor review, use the request form below.
      </p>
    ),
  },
  {
    id: "sub-processors",
    heading: "Sub-processors",
    body: (
      <p>
        Supabase (database, auth), Vercel (hosting), Cloudinary (video),
        Stripe (payments), Resend (email), Twilio (SMS/WhatsApp), and Anthropic
        (AI chat replies). Each is used for exactly one job — see our{" "}
        <a href="/privacy">Privacy Policy</a> for what each one receives.
      </p>
    ),
  },
  {
    id: "disclosure",
    heading: "Responsible disclosure",
    body: (
      <p>
        Found a vulnerability? Email{" "}
        <a href="mailto:security@loopinglive.com">security@loopinglive.com</a>{" "}
        with details and, if you have one, a proof of concept. We will
        acknowledge within two business days and keep you updated as we
        investigate. Please give us a reasonable window to fix an issue before
        any public disclosure.
      </p>
    ),
  },
  {
    id: "request",
    heading: "Request security documentation",
    body: (
      <p>
        Enterprise prospects can request our current security overview,
        sub-processor list, and SOC2 readiness status by emailing{" "}
        <a href="mailto:security@loopinglive.com">security@loopinglive.com</a>.
      </p>
    ),
  },
];

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security & Compliance"
      updated={UPDATED}
      intro={
        <p>
          How we protect your data, who else touches it, and where our SOC2
          readiness stands today.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
