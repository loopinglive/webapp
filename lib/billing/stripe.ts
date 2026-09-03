import "server-only";

import Stripe from "stripe";

/**
 * The Stripe client, created lazily.
 *
 * Constructing it at module load would crash every route on a deployment
 * without billing configured — which is the state Phases 1 to 6 ran in.
 */
let client: Stripe | null = null;

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set on this deployment.");
  }
  client ??= new Stripe(key);
  return client;
}

/** Whether billing is wired up here at all. */
export function billingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Whether webhooks can be verified — without this, plan changes never land. */
export function webhooksConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}
