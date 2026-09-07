"use client";

import { useEffect, useState } from "react";

import { FlutterwaveCheckout } from "@/components/global-expansion/FlutterwaveCheckout";
import { MpesaCheckout } from "@/components/global-expansion/MpesaCheckout";
import { PaystackCheckout } from "@/components/global-expansion/PaystackCheckout";
import { RazorpayCheckout } from "@/components/global-expansion/RazorpayCheckout";
import { StripeLocalMethods } from "@/components/global-expansion/StripeLocalMethods";
import { useLocalisedPricing } from "@/hooks/useLocalisedPricing";
import { PAID_PLANS, PLAN_BY_SLUG, type PlanSlug } from "@/lib/billing/plans";

const PROVIDER_COMPONENT: Record<string, typeof PaystackCheckout> = {
  paystack: PaystackCheckout,
  flutterwave: FlutterwaveCheckout,
  mpesa: MpesaCheckout,
  razorpay: RazorpayCheckout,
  stripe: StripeLocalMethods,
};

function format(amount: number, symbol: string): string {
  const rounded = Number.isInteger(amount) ? amount : Math.round(amount * 100) / 100;
  return `${symbol}${rounded.toLocaleString()}`;
}

/**
 * The checkout-time payment picker — shown on /upgrade (signed in) once a
 * plan is chosen. Only rendered when the visitor's country has a local
 * method configured; a Stripe-only region never sees this at all and keeps
 * using the existing pricing-grid flow unchanged.
 */
export function LocalPaymentMethods() {
  const { pricing, loading } = useLocalisedPricing();
  const [planSlug, setPlanSlug] = useState<PlanSlug>("monthly");
  const [methods, setMethods] = useState<string[]>([]);

  useEffect(() => {
    if (!pricing?.country) return;
    fetch(`/api/payments/local?country=${pricing.country}`)
      .then((response) => (response.ok ? response.json() : { methods: [] }))
      .then((data: { methods: string[] }) => setMethods(data.methods))
      .catch(() => setMethods([]));
  }, [pricing?.country]);

  const localMethods = methods.filter((method) => method !== "stripe");
  if (loading || !pricing || localMethods.length === 0) return null;

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-hairline bg-surface p-6">
      <h3 className="text-[14px] font-semibold text-ink">
        Pay with a local method — {pricing.countryName}
      </h3>
      <p className="mt-1 text-[12.5px] text-ink-faint">
        Card, mobile money, bank transfer, or UPI, priced in your local currency.
      </p>

      <div className="mt-4 flex gap-2">
        {PAID_PLANS.map((slug) => {
          const plan = PLAN_BY_SLUG.get(slug);
          const price = pricing.prices[slug];
          if (!plan || !price) return null;
          return (
            <button
              key={slug}
              onClick={() => setPlanSlug(slug)}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-center text-[12.5px] transition-colors ${
                planSlug === slug
                  ? "border-accent bg-accent/10 text-accent-soft"
                  : "border-hairline text-ink-muted hover:text-ink"
              }`}
            >
              <span className="block font-medium">{plan.name}</span>
              <span className="block">{format(price.amount, price.symbol)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2.5">
        {localMethods.map((method) => {
          const Component = PROVIDER_COMPONENT[method];
          const price = pricing.prices[planSlug];
          if (!Component || !price) return null;
          return <Component key={method} planSlug={planSlug} label={format(price.amount, price.symbol)} />;
        })}
      </div>
    </div>
  );
}
