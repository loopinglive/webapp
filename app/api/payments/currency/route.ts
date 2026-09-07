import { NextResponse } from "next/server";

import { PAID_PLANS } from "@/lib/billing/plans";
import { countryFromRequest } from "@/lib/payments/geo";
import { getLocalisedPricing, priceForPlan, standardPriceForPlan } from "@/lib/payments/pricing";

export const dynamic = "force-dynamic";

/**
 * Detects (or accepts a manual override of) the visitor's country and
 * returns the prices to show — localised where we have them, the standard
 * USD list price everywhere else.
 */
export async function GET(request: Request) {
  const override = new URL(request.url).searchParams.get("country")?.toUpperCase();
  const country = override || countryFromRequest(request);
  const pricing = await getLocalisedPricing(country);

  const prices = Object.fromEntries(
    PAID_PLANS.map((slug) => [slug, priceForPlan(pricing, slug) ?? standardPriceForPlan(slug)])
  );
  const standardPrices = Object.fromEntries(PAID_PLANS.map((slug) => [slug, standardPriceForPlan(slug)]));

  return NextResponse.json({
    country: pricing?.country_code ?? country ?? null,
    countryName: pricing?.country_name ?? null,
    currency: pricing?.currency_code ?? "USD",
    symbol: pricing?.currency_symbol ?? "$",
    isPPP: Boolean(pricing && pricing.purchasing_power_parity_factor < 1),
    pppFactor: pricing?.purchasing_power_parity_factor ?? 1,
    paymentMethods: pricing?.payment_methods ?? ["stripe"],
    prices,
    standardPrices,
  });
}
