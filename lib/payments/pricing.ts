import "server-only";

import { PLAN_BY_SLUG, type PlanSlug } from "@/lib/billing/plans";
import { createServiceClient } from "@/lib/supabase/server";
import type { LocalizedPricingRow } from "@/types/database";

export async function getLocalisedPricing(countryCode: string | null): Promise<LocalizedPricingRow | null> {
  if (!countryCode) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("localized_pricing")
    .select("*")
    .eq("country_code", countryCode)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

export type LocalPrice = { amount: number; currency: string; symbol: string };

/** The local-currency price for a plan, or null for `free` / an unpriced country. */
export function priceForPlan(pricing: LocalizedPricingRow | null, slug: PlanSlug): LocalPrice | null {
  if (!pricing) return null;

  const amount =
    slug === "monthly" ? pricing.monthly_price :
    slug === "yearly" ? pricing.yearly_price :
    slug === "lifetime" ? pricing.lifetime_price :
    null;

  if (amount === null) return null;
  return { amount, currency: pricing.currency_code, symbol: pricing.currency_symbol };
}

/** The USD list price for a plan, straight off the plan definition — the fallback everyone else gets. */
export function standardPriceForPlan(slug: PlanSlug): LocalPrice | null {
  const plan = PLAN_BY_SLUG.get(slug);
  if (!plan || plan.amountCents === null) return null;
  return { amount: plan.amountCents / 100, currency: "USD", symbol: "$" };
}
