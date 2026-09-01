export const SITE = {
  name: "Loopinglive",
  tagline: "Go live. On repeat. Forever.",
  description:
    "Automated fake-live webinars that convert like real live events — waiting rooms, a buzzing chat, AI personas, and timed offers.",
  /**
   * Absolute origin, used for metadataBase and share links.
   *
   * `||` rather than `??` on purpose: Next inlines an unset NEXT_PUBLIC_* var
   * as an empty string at build time, and `??` would let "" through into
   * `new URL("")`, which throws and fails the build. Falls back to the
   * deployment's own URL before localhost so a preview build is self-referential.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "") ||
    "http://localhost:3000",
} as const;

export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    cadence: "forever",
    blurb: "See the whole platform. Unlock it when you are ready.",
    features: [
      "Full dashboard preview",
      "1 draft webinar",
      "All features locked",
      "Upgrade anytime",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 1800,
    cadence: "per year",
    blurb: "Everything, unlimited, billed annually.",
    features: [
      "Unlimited webinars & sessions",
      "AI personas + admin live override",
      "Full follow-up automation",
      "Analytics & watch-depth heatmaps",
      "Stripe checkout & offer builder",
    ],
    cta: "Go yearly",
    highlight: true,
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: 4800,
    cadence: "one time",
    blurb: "Pay once. Run webinars forever.",
    features: [
      "Everything in Yearly",
      "Lifetime access, no renewals",
      "White label branding",
      "Priority support",
    ],
    cta: "Buy lifetime",
    highlight: false,
  },
] as const;

export const REACTIONS = ["👏", "🔥", "❤️", "💯"] as const;

export const WATCH_DEPTH_SEGMENTS = [
  { id: "0-30", label: "0–30%", min: 0, max: 30 },
  { id: "30-50", label: "30–50%", min: 30, max: 50 },
  { id: "50-70", label: "50–70%", min: 50, max: 70 },
  { id: "70-90", label: "70–90%", min: 70, max: 90 },
  { id: "90-100", label: "90–100%", min: 90, max: 100 },
] as const;
