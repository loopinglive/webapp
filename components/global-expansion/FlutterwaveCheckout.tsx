"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import type { PlanSlug } from "@/lib/billing/plans";

export function FlutterwaveCheckout({ planSlug, label }: { planSlug: PlanSlug; label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/local/flutterwave/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Could not start checkout.");
        setPending(false);
        return;
      }
      window.location.href = payload.url;
    } catch {
      setError("Could not reach Flutterwave.");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-surface px-4 text-[13px] font-medium text-ink transition-colors hover:border-accent/40 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Pay with Flutterwave — {label}
      </button>
      {error && <p className="mt-1.5 text-[12px] text-[#FF6B6B]">{error}</p>}
    </div>
  );
}
