"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import type { SectionProps } from "@/components/registration-builder/BuilderSidebar";
import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; colour: string }> = {
  not_connected: { label: "Not connected", colour: "#A0A0B0" },
  pending: { label: "Waiting for DNS", colour: "#FF9500" },
  connected: { label: "Live", colour: "#00C851" },
  failed: { label: "Not pointing here", colour: "#FF3B3B" },
};

type DnsRecord = { type: string; name: string; value: string };

/**
 * Connecting a domain to this registration page.
 *
 * The records shown come from the server rather than a constant in this file.
 * The previous version hardcoded a CNAME to cname.loopinglive.com — a
 * hostname that does not resolve — and told every customer to use it,
 * including those connecting an apex domain, which cannot hold a CNAME at
 * all. Now the API returns the exact record for the domain that was typed,
 * and this only renders it.
 */
export function CustomDomainSection({
  webinarId,
  config,
  update,
}: SectionProps & { webinarId: string }) {
  const [domain, setDomain] = useState(config.custom_domain ?? "");
  const [checking, setChecking] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const status = STATUS[config.custom_domain_status] ?? STATUS.not_connected;

  // Reads current state without re-registering, so opening the panel shows
  // where a domain actually got to rather than the last value written.
  const refresh = useCallback(async () => {
    const response = await fetch(`/api/admin/registration/custom-domain?webinarId=${webinarId}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      status?: string;
      detail?: string;
      records?: DnsRecord[];
    };
    setRecords(payload.records ?? []);
    if (payload.detail) setDetail(payload.detail);
    if (payload.status && payload.status !== config.custom_domain_status) {
      update({ custom_domain_status: payload.status as typeof config.custom_domain_status });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  // A domain that is propagating resolves on its own schedule, so poll while
  // the panel is open rather than making the host keep pressing a button.
  useEffect(() => {
    if (config.custom_domain_status !== "pending") return;
    const timer = setInterval(() => void refresh(), 20000);
    return () => clearInterval(timer);
  }, [config.custom_domain_status, refresh]);

  async function connect() {
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
      records?: DnsRecord[];
      error?: string;
    };

    setChecking(false);

    if (!response.ok) {
      setDetail(payload.error ?? "That domain could not be connected.");
      return;
    }

    update({
      custom_domain: domain || null,
      custom_domain_status: (payload.status ?? "not_connected") as typeof config.custom_domain_status,
    });
    setRecords(payload.records ?? []);
    setDetail(payload.detail || null);
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
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

      {domain && records.length > 0 && (
        <div className="space-y-3 rounded-lg border border-surface-3 bg-surface-2 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Add this at your DNS provider
          </p>

          {records.map((record) => (
            <div key={`${record.type}-${record.name}`} className="space-y-1.5">
              <div className="flex gap-2 text-[11px]">
                <span className="rounded bg-void px-1.5 py-0.5 font-mono text-ink-muted">
                  {record.type}
                </span>
                <span className="font-mono text-ink-muted">name: {record.name}</span>
              </div>
              <span className="flex items-center gap-2 rounded border border-surface-3 bg-void px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">
                  {record.value}
                </span>
                <button
                  onClick={() => copy(record.value)}
                  aria-label={`Copy ${record.type} value`}
                  className="shrink-0 text-ink-muted hover:text-ink"
                >
                  {copied === record.value ? (
                    <Check className="h-3 w-3 text-[#00C851]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </span>
            </div>
          ))}

          <p className="text-[11px] leading-relaxed text-ink-muted">
            The certificate is issued automatically once the record resolves. DNS changes can take up
            to 48 hours, and this panel keeps checking on its own.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[12px]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.colour }} />
          <span style={{ color: status.colour }}>{status.label}</span>
        </span>

        <AdminButton variant="secondary" onClick={connect} disabled={checking}>
          {checking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {config.custom_domain ? "Re-check" : "Connect domain"}
        </AdminButton>
      </div>

      {detail && (
        <p
          className={cn(
            "text-[11.5px] leading-relaxed",
            config.custom_domain_status === "failed" ? "text-[#FF3B3B]" : "text-ink-muted"
          )}
        >
          {detail}
        </p>
      )}
    </>
  );
}
