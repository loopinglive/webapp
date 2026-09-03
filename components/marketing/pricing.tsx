import Link from "next/link";
import { Check, X } from "lucide-react";

import { PLANS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

/**
 * Public pricing.
 *
 * Every card sends people to signup rather than straight to checkout — an
 * account has to exist before Stripe can attach a customer to it, and asking
 * for a card before the free tier has been seen loses more than it wins.
 */
export function Pricing() {
  return (
    <section id="pricing" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
            Pricing
          </span>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
            Start free and build your entire webinar. Pay only when you are ready to
            go live.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.slug}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-[#12121A] p-7 transition-all duration-300",
                plan.highlight
                  ? "border-[#6C47FF]/50 shadow-[0_0_70px_-25px_#6C47FF] lg:-my-3 lg:py-10"
                  : "border-[#1E1E2E] hover:border-[#2A2A3A]"
              )}
            >
              {plan.badge && (
                <span
                  className={cn(
                    "absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
                    plan.highlight
                      ? "bg-gradient-to-r from-[#6C47FF] to-[#00D4FF] text-white"
                      : "bg-[#1E1E2E] text-[#A0A0B0]"
                  )}
                >
                  {plan.badge}
                </span>
              )}

              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
                {plan.name}
              </h3>

              <div className="mt-3">
                <span className="text-[36px] font-semibold tracking-[-0.03em] text-white">
                  {plan.priceDisplay}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] text-[#6E6E80]">{plan.cadence}</p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00C851]" />
                    ) : (
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6E6E80]" />
                    )}
                    <span
                      className={cn(
                        "text-[13px] leading-relaxed",
                        feature.included ? "text-[#D4D4DE]" : "text-[#6E6E80]"
                      )}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.slug === "free" ? "/signup" : `/signup?plan=${plan.slug}`}
                className={cn(
                  "mt-7 flex h-11 w-full items-center justify-center rounded-full text-[14px] font-semibold transition-all duration-200",
                  plan.slug === "lifetime"
                    ? "bg-gradient-to-r from-[#6C47FF] to-[#00D4FF] text-white hover:opacity-90"
                    : plan.highlight
                      ? "bg-[#6C47FF] text-white shadow-[0_12px_36px_-10px_#6C47FF] hover:bg-[#7C5AFF]"
                      : "border border-[#2A2A3A] text-white hover:border-[#6C47FF]/50"
                )}
              >
                {plan.slug === "free"
                  ? "Start free"
                  : plan.slug === "lifetime"
                    ? "Get lifetime access"
                    : `Start ${plan.name}`}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[12.5px] text-[#6E6E80]">
          <span>🔒 Secure payment via Stripe</span>
          <span>💳 All major cards accepted</span>
          <span>✅ 30-day money-back guarantee</span>
          <span>Have a coupon? Enter it at checkout.</span>
        </div>
      </div>
    </section>
  );
}
