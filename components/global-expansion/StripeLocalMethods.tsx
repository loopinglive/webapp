"use client";

import type { PlanSlug } from "@/lib/billing/plans";
import { useBilling } from "@/hooks/useBilling";

/**
 * Stripe Checkout already surfaces the right local payment methods for a
 * customer's card and region automatically once enabled in the Stripe
 * Dashboard (iDEAL, Bancontact, Apple Pay, Google Pay, etc.) — there is
 * nothing bespoke to build here beyond reusing the existing checkout flow.
 */
export function StripeLocalMethods({ planSlug, label }: { planSlug: PlanSlug; label: string }) {
  const { startCheckout, pending, error } = useBilling();

  return (
    <div>
      <button
        onClick={() => startCheckout(planSlug)}
        disabled={pending === planSlug}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-surface px-4 text-[13px] font-medium text-ink transition-colors hover:border-accent/40 disabled:opacity-50"
      >
        Pay by card — {label}
      </button>
      {error && <p className="mt-1.5 text-[12px] text-[#FF6B6B]">{error}</p>}
    </div>
  );
}
