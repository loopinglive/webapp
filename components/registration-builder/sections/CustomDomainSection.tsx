"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import type { SectionProps } from "@/components/registration-builder/BuilderSidebar";
import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { cn } from "@/lib/utils";

const CNAME_TARGET = "cname.loopinglive.com";

const STATUS: Record<string, { label: string; colour: string }> = {
  not_connected: { label: "Not connected", colour: "#A0A0B0" },
  pending: { label: "Waiting for DNS", colour: "#FF9500" },
  connected: { label: "Connected", colour: "#00C851" },
  failed: { label: "Not pointing here", colour: "#FF3B3B" },
};

export function CustomDomainSection({
  webinarId,
  config,
  update,
}: SectionProps & { webinarId: string }) {
  const [domain, setDomain] = useState(config.custom_domain ?? "");
  const [checking, setChecking] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const status = STATUS[config.custom_domain_status] ?? STATUS.not_connected;

  async function verify() {
    setChecking(true);
    setDetail(null);

    const response = await fetch("/api/admin/registration/custom-domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, domain }),
    });

    const payload = (await response.json()) as {
      status?: string;
      detail?: string;
      error?: string;
    };

    setChecking(false);

    if (!response.ok) {
      setDetail(payload.error ?? "That check failed.");
      return;
    }

    update({
      custom_domain: domain || null,
      custom_domain_status: (payload.status ?? "not_connected") as
        | "not_connected"
        | "pending"
        | "connected"
        | "failed",
    });
    setDetail(payload.detail || null);
  }

  return (
    <>
      <div className="rounded-lg border border-surface-3 bg-surface-2 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Current URL
        </p>
        <p className="mt-1.5 break-all font-mono text-[11.5px] text-ink/80">
          loopinglive.com/webinar/{webinarId}/register
        </p>
        <p className="mt-2 text-[11px] text-ink-muted">
          This always works, with or without a custom domain.
        </p>
      </div>

      <Field label="Your domain">
        <TextInput
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="webinar.yourdomain.com"
        />
      </Field>

      {domain && (
        <div className="space-y-3 rounded-lg border border-surface-3 bg-surface-2 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            DNS setup
          </p>

          <ol className="space-y-2.5 text-[11.5px] leading-relaxed text-ink/75">
            <li>
              <span className="text-ink-muted">1.</span> In your DNS provider,
              add a <span className="text-ink">CNAME</span> record.
            </li>
            <li>
              <span className="text-ink-muted">2.</span> Point{" "}
              <span className="font-mono text-ink">{domain}</span> to:
              <span className="mt-1.5 flex items-center gap-2 rounded border border-surface-3 bg-void px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">
                  {CNAME_TARGET}
                </span>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(CNAME_TARGET);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  aria-label="Copy"
                  className="shrink-0 text-ink-muted hover:text-ink"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-[#00C851]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </span>
            </li>
            <li>
              <span className="text-ink-muted">3.</span> DNS changes can take up
              to 48 hours to propagate.
            </li>
          </ol>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[12px]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: status.colour }}
          />
          <span style={{ color: status.colour }}>{status.label}</span>
        </span>

        <AdminButton variant="secondary" onClick={verify} disabled={checking}>
          {checking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Verify DNS
        </AdminButton>
      </div>

      {detail && (
        <p
          className={cn(
            "text-[11.5px] leading-relaxed",
            config.custom_domain_status === "failed"
              ? "text-[#FF3B3B]"
              : "text-ink-muted"
          )}
        >
          {detail}
        </p>
      )}
    </>
  );
}
