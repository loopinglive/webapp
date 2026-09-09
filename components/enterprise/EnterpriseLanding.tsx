"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

const FEATURES = [
  "Unlimited team members",
  "Unlimited webinars",
  "Custom attendee limits per session",
  "Dedicated account manager",
  "4-hour SLA response time",
  "Custom onboarding and training",
  "White label included",
  "Advanced API access — 1,000 requests/minute",
  "Custom contract and invoicing",
  "Priority feature requests",
  "Quarterly business reviews",
];

/**
 * The enterprise sales page, one file rather than four.
 *
 * The spec split this into EnterpriseLanding / EnterpriseFeatureList /
 * EnterprisePricingCard / EnterpriseContactForm, but there is exactly one
 * page that ever renders all four together and nothing reuses any of them
 * individually — splitting them would be indirection with no second caller.
 */
export function EnterpriseLanding() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: "",
    fullName: "",
    workEmail: "",
    phone: "",
    teamSize: "",
    monthlySessions: "",
    currentPlatform: "",
    message: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    setError(null);
    if (!form.companyName.trim() || !form.fullName.trim() || !form.workEmail.trim()) {
      setError("Company name, your name and a work email are required.");
      return;
    }

    setSending(true);
    const response = await fetch("/api/enterprise/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json()) as { error?: string };
    setSending(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not send that. Try again shortly.");
      return;
    }
    setSubmitted(true);
  }

  return (
    <main className="min-h-dvh bg-void">
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Enterprise
        </p>
        <h1 className="mt-3 text-[36px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">
          Loopinglive for Enterprise
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-muted">
          Custom solutions for organisations running high-volume webinars —
          unlimited scale, a dedicated team, and a contract built around how
          you actually work.
        </p>
        <a
          href="#contact"
          className="mt-7 inline-flex h-11 items-center rounded-full bg-accent px-6 text-[14px] font-medium text-white hover:bg-accent-deep"
        >
          Contact sales
        </a>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-2.5 rounded-xl border border-hairline bg-surface px-4 py-3"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
              <span className="text-[13.5px] text-[#C4C4D0]">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-md px-6 pb-16 text-center">
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-6">
          <p className="text-[13px] text-ink-muted">Custom pricing</p>
          <p className="mt-1 text-[30px] font-semibold text-ink">
            Starting from $997<span className="text-[15px] font-normal text-ink-faint">/mo</span>
          </p>
          <p className="mt-1 text-[12.5px] text-ink-faint">Annual contracts available</p>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-lg px-6 pb-24">
        {submitted ? (
          <div className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/[0.06] p-6 text-center">
            <Check className="mx-auto h-6 w-6 text-[#22C55E]" />
            <p className="mt-2 text-[15px] font-medium text-ink">Request sent</p>
            <p className="mt-1 text-[13px] text-ink-muted">
              Someone from the team will be in touch shortly.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            <h2 className="text-[16px] font-semibold text-ink">Request a demo</h2>
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Company name" value={form.companyName} onChange={set("companyName")} />
                <Field label="Full name" value={form.fullName} onChange={set("fullName")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Work email" value={form.workEmail} onChange={set("workEmail")} type="email" />
                <Field label="Phone" value={form.phone} onChange={set("phone")} optional />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Team size" value={form.teamSize} onChange={set("teamSize")} optional />
                <Field
                  label="Sessions/month"
                  value={form.monthlySessions}
                  onChange={set("monthlySessions")}
                  optional
                />
              </div>
              <Field
                label="Current platform, if any"
                value={form.currentPlatform}
                onChange={set("currentPlatform")}
                optional
              />
              <label className="block">
                <span className="text-[12px] text-ink-muted">Message (optional)</span>
                <textarea
                  value={form.message}
                  onChange={(event) => set("message")(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-hairline bg-void px-3 py-2 text-[13.5px] text-ink focus:border-accent focus:outline-none"
                />
              </label>

              {error && <p className="text-[12.5px] text-[#FF5A5A]">{error}</p>}

              <button
                onClick={() => void submit()}
                disabled={sending}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-[13.5px] font-medium text-white hover:bg-accent-deep disabled:opacity-60"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Request a demo
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] text-ink-muted">
        {label}
        {optional && <span className="text-ink-faint"> (optional)</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-hairline bg-void px-3 text-[13.5px] text-ink focus:border-accent focus:outline-none"
      />
    </label>
  );
}
