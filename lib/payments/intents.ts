import "server-only";

import type { PlanSlug } from "@/lib/billing/plans";
import { createServiceClient } from "@/lib/supabase/server";

/** Opens a local_payment_intents row when a checkout starts. */
export async function createPaymentIntent(params: {
  provider: string;
  providerReference: string;
  userId: string;
  planSlug: PlanSlug;
  amount: number;
  currency: string;
}): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("local_payment_intents").insert({
    provider: params.provider,
    provider_reference: params.providerReference,
    user_id: params.userId,
    plan_slug: params.planSlug,
    amount: params.amount,
    currency: params.currency,
    status: "pending",
  });
}

/** Read-only lookup, for a caller that needs to check ownership before deciding whether to claim. */
export async function peekPaymentIntent(
  provider: string,
  providerReference: string
): Promise<{ userId: string | null; status: string } | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("local_payment_intents")
    .select("user_id, status")
    .eq("provider", provider)
    .eq("provider_reference", providerReference)
    .maybeSingle();

  return data ? { userId: data.user_id, status: data.status } : null;
}

/**
 * Atomically moves one intent from pending to completed.
 *
 * A webhook and a browser-redirect callback can both arrive for the same
 * payment — this update only succeeds for whichever gets here first, so the
 * plan only ever gets activated once regardless of which path wins the race
 * or whether a provider retries its webhook.
 */
export async function claimPaymentIntent(
  provider: string,
  providerReference: string
): Promise<{ userId: string; planSlug: PlanSlug; amount: number; currency: string } | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("local_payment_intents")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("provider_reference", providerReference)
    .eq("status", "pending")
    .select("user_id, plan_slug, amount, currency")
    .maybeSingle();

  if (error || !data || !data.user_id) return null;

  return {
    userId: data.user_id,
    planSlug: data.plan_slug as PlanSlug,
    amount: data.amount,
    currency: data.currency,
  };
}
