/**
 * Plan definitions and the permission rules that hang off them.
 *
 * The prices here are the source of truth for display; Stripe is the source of
 * truth for what was actually charged. Kept free of `server-only` so the
 * marketing page and the upgrade wall can both render from the same values.
 */

export type PlanSlug = "free" | "monthly" | "yearly" | "lifetime";

export type PlanDefinition = {
  slug: PlanSlug;
  name: string;
  priceDisplay: string;
  /** The line under the price. */
  cadence: string;
  billingPeriod: "free" | "monthly" | "yearly" | "lifetime";
  /** Cents, for arithmetic. Null for free. */
  amountCents: number | null;
  features: { text: string; included: boolean }[];
  badge?: string;
  highlight?: boolean;
};

export const PLANS: PlanDefinition[] = [
  {
    slug: "free",
    name: "Free",
    priceDisplay: "$0",
    cadence: "forever",
    billingPeriod: "free",
    amountCents: 0,
    features: [
      { text: "Full webinar setup", included: true },
      { text: "Upload videos", included: true },
      { text: "Create fake personas", included: true },
      { text: "Configure automation", included: true },
      { text: "Build registration pages", included: true },
      { text: "Go live", included: false },
    ],
  },
  {
    slug: "monthly",
    name: "Monthly",
    priceDisplay: "$47",
    cadence: "per month, cancel anytime",
    billingPeriod: "monthly",
    amountCents: 4700,
    features: [
      { text: "Everything in Free", included: true },
      { text: "Go live instantly", included: true },
      { text: "Unlimited sessions", included: true },
      { text: "AI personas", included: true },
      { text: "SMS + WhatsApp automation", included: true },
      { text: "Full analytics", included: true },
    ],
  },
  {
    slug: "yearly",
    name: "Yearly",
    priceDisplay: "$347",
    cadence: "per year ($28.92/month)",
    billingPeriod: "yearly",
    amountCents: 34700,
    badge: "Most popular — save 38%",
    highlight: true,
    features: [
      { text: "Everything in Monthly", included: true },
      { text: "Priority support", included: true },
      { text: "Early access to new features", included: true },
    ],
  },
  {
    slug: "lifetime",
    name: "Lifetime",
    priceDisplay: "$1,397",
    cadence: "one-time payment, own it forever",
    billingPeriod: "lifetime",
    amountCents: 139700,
    badge: "Best value",
    features: [
      { text: "Everything in Yearly", included: true },
      { text: "Pay once, use forever", included: true },
      { text: "All future updates included", included: true },
      { text: "VIP support", included: true },
    ],
  },
];

export const PLAN_BY_SLUG = new Map(PLANS.map((plan) => [plan.slug, plan]));

export const PAID_PLANS: PlanSlug[] = ["monthly", "yearly", "lifetime"];

/** Maps a plan to its Stripe price ID. Absent in local development. */
export function stripePriceId(slug: PlanSlug) {
  switch (slug) {
    case "monthly":
      return process.env.STRIPE_MONTHLY_PRICE_ID ?? "";
    case "yearly":
      return process.env.STRIPE_YEARLY_PRICE_ID ?? "";
    case "lifetime":
      return process.env.STRIPE_LIFETIME_PRICE_ID ?? "";
    default:
      return "";
  }
}

export type AccountPlanState = {
  plan_slug: string | null;
  subscription_status: string | null;
  plan_expires_at: string | null;
  is_suspended: boolean | null;
};

/**
 * The single place that decides what an account may do.
 *
 * Both the middleware and the UI read this, so a free user cannot be shown a
 * working Publish button by one code path while another blocks it.
 */
export function planPermissions(account: AccountPlanState | null) {
  const slug = (account?.plan_slug ?? "free") as PlanSlug;
  const suspended = Boolean(account?.is_suspended);

  // Lifetime never expires — plan_expires_at is null for it by design.
  const expired =
    slug !== "lifetime" &&
    Boolean(account?.plan_expires_at) &&
    new Date(account!.plan_expires_at!).getTime() < Date.now();

  // past_due keeps access during the grace period; only cancelled or an
  // elapsed expiry actually removes it.
  const cancelled = account?.subscription_status === "cancelled";

  const isPaid = PAID_PLANS.includes(slug);
  const active = isPaid && !expired && !cancelled && !suspended;

  return {
    planSlug: slug,
    plan: PLAN_BY_SLUG.get(slug) ?? PLAN_BY_SLUG.get("free")!,
    isPaid,
    isFree: !isPaid,
    isExpired: expired,
    isSuspended: suspended,
    isPastDue: account?.subscription_status === "past_due",
    canGoLive: active,
    canPublish: active,
  };
}

export type PlanPermissions = ReturnType<typeof planPermissions>;
