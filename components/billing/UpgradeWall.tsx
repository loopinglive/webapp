"use client";

import { useEffect, useState } from "react";
import { Rocket, X } from "lucide-react";

import { PricingCard } from "@/components/billing/PricingCard";
import { useBilling } from "@/hooks/useBilling";
import { PLANS, type PlanSlug } from "@/lib/billing/plans";

/**
 * Shown when a free account tries to publish or go live.
 *
 * Deliberately not a dead end: the copy acknowledges the work already done,
 * because the person seeing this has just finished building a webinar.
 */
export function UpgradeWall({
  open,
  onClose,
  hostCount,
}: {
  open: boolean;
  onClose: () => void;
  hostCount?: number;
}) {
  const { startCheckout, pending, error } = useBilling();
  const [coupon, setCoupon] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const paid = PLANS.filter((plan) => plan.slug !== "free");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-wall-title"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="relative w-full max-w-[980px] rounded-3xl border border-[#1E1E2E] bg-[#0D0D15] p-6 shadow-2xl sm:p-10">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-[#6E6E80] transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#6C47FF] to-[#00D4FF]">
            <Rocket className="h-5 w-5 text-white" />
          </span>

          <h2
            id="upgrade-wall-title"
            className="mt-4 text-[26px] font-semibold tracking-[-0.025em] text-white sm:text-[30px]"
          >
            You are ready to go live
          </h2>
          <p className="mx-auto mt-2 max-w-[46ch] text-[14.5px] leading-relaxed text-[#A0A0B0]">
            Your webinar is fully set up. Upgrade now to start converting — everything
            you have built stays exactly as it is.
          </p>

          {typeof hostCount === "number" && hostCount > 0 && (
            <p className="mt-3 text-[12.5px] text-[#6E6E80]">
              Join {hostCount.toLocaleString()} hosts already converting on autopilot
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {paid.map((plan) => (
            <PricingCard
              key={plan.slug}
              plan={plan}
              compact
              pending={pending === plan.slug}
              onSelect={(slug: PlanSlug) => startCheckout(slug, coupon || undefined)}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex w-full max-w-[340px] items-center gap-2">
            <input
              value={coupon}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              placeholder="Coupon code (optional)"
              className="h-10 flex-1 rounded-full border border-[#1E1E2E] bg-[#12121A] px-4 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
            />
          </div>

          {error && <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>}

          <p className="text-[11.5px] text-[#6E6E80]">
            🔒 Secure payment via Stripe · 30-day money-back guarantee
          </p>

          <button
            onClick={onClose}
            className="text-[13px] text-[#6E6E80] transition-colors hover:text-white"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
