"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import type { WhiteLabelForm } from "@/hooks/useWhiteLabel";

const EXPECTED_TARGET = "cname.loopinglive.com";

export function CustomDomainSetup({
  form,
  update,
  verifyDomain,
  verifying,
}: {
  form: WhiteLabelForm;
  update: <K extends keyof WhiteLabelForm>(key: K, value: WhiteLabelForm[K]) => void;
  verifyDomain: () => Promise<{ verified: boolean; expected: string; detail: string }>;
  verifying: boolean;
}) {
  const [result, setResult] = useState<{ verified: boolean; detail: string } | null>(null);

  async function check() {
    const payload = await verifyDomain();
    setResult(payload);
  }

  const status = form.custom_domain_verified
    ? "Active"
    : form.custom_domain
      ? "Not verified"
      : "Not connected";

  return (
    <div className="space-y-3">
      <label className="block text-[12.5px] font-medium text-[#D0D0DC]">
        Custom domain
      </label>
      <div className="flex gap-2">
        <input
          value={form.custom_domain ?? ""}
          onChange={(event) => update("custom_domain", event.target.value)}
          placeholder="webinars.yourbrand.com"
          className="flex-1 rounded-lg border border-hairline bg-[#1A1A24] px-3 py-2.5 text-[13px] text-white placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={check}
          disabled={!form.custom_domain || verifying}
          className="flex items-center gap-1.5 rounded-lg border border-hairline bg-[#1A1A24] px-3.5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[#22222E] disabled:opacity-40"
        >
          {verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Verify DNS
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[12px]">
        {status === "Active" ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-[#00C851]" />
        ) : status === "Not verified" ? (
          <XCircle className="h-3.5 w-3.5 text-[#FF9500]" />
        ) : null}
        <span
          className={
            status === "Active"
              ? "text-[#00C851]"
              : status === "Not verified"
                ? "text-[#FF9500]"
                : "text-ink-faint"
          }
        >
          {status}
        </span>
      </div>

      <div className="rounded-lg border border-hairline bg-void px-3.5 py-3 text-[12px] leading-relaxed text-ink-muted">
        Add a CNAME record at your DNS provider:
        <div className="mt-2 flex items-center gap-2 rounded bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-cyan">
          {form.custom_domain || "webinars.yourbrand.com"} → {EXPECTED_TARGET}
        </div>
        SSL is provisioned automatically once verified. Propagation can take up to an hour.
      </div>

      {result && !result.verified && (
        <p className="text-[12px] text-[#FF9500]">
          Not verified yet{result.detail ? ` — found: ${result.detail}` : ""}. DNS can take time to propagate.
        </p>
      )}
    </div>
  );
}
