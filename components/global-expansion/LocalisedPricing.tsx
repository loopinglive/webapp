"use client";

import { CurrencySelector } from "@/components/global-expansion/CurrencySelector";
import { PPPBanner } from "@/components/global-expansion/PPPBanner";
import { useLocalisedPricing } from "@/hooks/useLocalisedPricing";
import { PAID_PLANS, PLAN_BY_SLUG } from "@/lib/billing/plans";

function format(amount: number, symbol: string): string {
  const rounded = Number.isInteger(amount) ? amount : Math.round(amount * 100) / 100;
  return `${symbol}${rounded.toLocaleString()}`;
}

/**
 * Replaces the standard-price row under each plan card with the visitor's
 * localised price, when one applies — plus the manual override selector.
 * Purely informational: no checkout happens here, only on /upgrade once
 * signed in.
 */
export function LocalisedPricing() {
  const { pricing, setCountry, overrideCountry } = useLocalisedPricing();

  return (
    <div className="mb-8">
      <div className="mb-4 flex justify-center">
        <CurrencySelector value={overrideCountry} onChange={setCountry} />
      </div>

      <PPPBanner />

      {pricing?.isPPP && (
        <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
          {PAID_PLANS.map((slug) => {
            const local = pricing.prices[slug];
            const standard = pricing.standardPrices[slug];
            const plan = PLAN_BY_SLUG.get(slug);
            if (!local || !plan) return null;

            return (
              <div key={slug} className="rounded-xl border border-hairline bg-surface px-4 py-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">{plan.name}</p>
                <p className="mt-1 text-[20px] font-semibold text-ink">
                  {format(local.amount, local.symbol)}
                </p>
                {standard && (
                  <p className="mt-0.5 text-[11.5px] text-ink-faint">
                    (equivalent to {format(standard.amount, standard.symbol)})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
