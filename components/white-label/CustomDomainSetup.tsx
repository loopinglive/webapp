"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";

import type { WhiteLabelForm } from "@/hooks/useWhiteLabel";

type DnsRecord = { type: string; name: string; value: string };

/**
 * The DNS records come from the server, not a constant here.
 *
 * This panel used to print a CNAME to cname.loopinglive.com for every domain
 * — a hostname that does not resolve — and told apex domains to use a CNAME,
 * which DNS does not permit. The API now returns the right record for the
 * domain that was actually entered, and this renders it.
 */
export function CustomDomainSetup({
  form,
  update,
  verifyDomain,
  verifying,
}: {
  form: WhiteLabelForm;
  update: <K extends keyof WhiteLabelForm>(key: K, value: WhiteLabelForm[K]) => void;
  verifyDomain: () => Promise<{
    verified: boolean;
    expected: string;
    detail: string;
    records?: DnsRecord[];
  }>;
  verifying: boolean;
}) {
  const [result, setResult] = useState<{ verified: boolean; detail: string } | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // Current state on open, without re-registering the domain.
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch("/api/white-label/verify-domain", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { records?: DnsRecord[]; detail?: string } | null) => {
          if (payload?.records) setRecords(payload.records);
        })
        .catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function check() {
    const payload = await verifyDomain();
    setResult(payload);
    if (payload.records) setRecords(payload.records);
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
  }

  const status = form.custom_domain_verified
    ? "Live"
    : form.custom_domain
      ? "Waiting for DNS"
      : "Not connected";

  return (
    <div className="space-y-3">
      <label className="block text-[12.5px] font-medium text-ink-muted">Custom domain</label>
      <div className="flex gap-2">
        <input
          value={form.custom_domain ?? ""}
          onChange={(event) => update("custom_domain", event.target.value)}
          placeholder="webinars.yourbrand.com"
          className="flex-1 rounded-lg border border-hairline bg-surface-2 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={check}
          disabled={!form.custom_domain || verifying}
          className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3.5 py-2.5 text-[12.5px] font-medium text-ink transition hover:bg-surface-3 disabled:opacity-40"
        >
          {verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {form.custom_domain_verified ? "Re-check" : "Connect"}
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[12px]">
        {status === "Live" ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-[#00C851]" />
        ) : status === "Waiting for DNS" ? (
          <XCircle className="h-3.5 w-3.5 text-[#FF9500]" />
        ) : null}
        <span
          className={
            status === "Live"
              ? "text-[#00C851]"
              : status === "Waiting for DNS"
                ? "text-[#FF9500]"
                : "text-ink-faint"
          }
        >
          {status}
        </span>
      </div>

      {records.length > 0 && (
        <div className="space-y-2.5 rounded-lg border border-hairline bg-void px-3.5 py-3">
          <p className="text-[12px] text-ink-muted">Add this at your DNS provider:</p>
          {records.map((record) => (
            <div key={`${record.type}-${record.name}`} className="space-y-1.5">
              <div className="flex gap-2 text-[11px]">
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-ink-muted">
                  {record.type}
                </span>
                <span className="font-mono text-ink-muted">name: {record.name}</span>
              </div>
              <span className="flex items-center gap-2 rounded bg-surface-2 px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-cyan">
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
          <p className="text-[11.5px] leading-relaxed text-ink-muted">
            The certificate is issued automatically once the record resolves. DNS changes can take up
            to 48 hours.
          </p>
        </div>
      )}

      {result && !result.verified && (
        <p className="text-[12px] text-[#FF9500]">
          {result.detail || "Not live yet. DNS can take time to propagate."}
        </p>
      )}
    </div>
  );
}
