"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { PricingCard } from "@/components/billing/PricingCard";
import { useBilling } from "@/hooks/useBilling";
import { PLANS, type PlanSlug } from "@/lib/billing/plans";

const FAQ = [
  {
    q: "What happens to everything I have already built?",
    a: "Nothing changes. Your webinars, videos, personas, timed comments and automation stay exactly as they are — upgrading only unlocks the ability to publish and go live.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, at any time, from your billing settings. You keep access until the end of the period you have paid for.",
  },
  {
    q: "What is the difference between yearly and lifetime?",
    a: "Yearly renews each year at $347. Lifetime is a single payment of $1,397 and never renews — it works out cheaper from year five onward, and includes every future update.",
  },
  {
    q: "Is there a refund policy?",
    a: "Thirty days, no questions asked. If it is not right for you, email us and we refund in full.",
  },
];

export function UpgradePage({ currentPlan }: { currentPlan: string }) {
  const params = useSearchParams();
  const cancelled = params.get("cancelled") === "true";

  const { startCheckout, pending, error } = useBilling();
  const [coupon, setCoupon] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="min-h-dvh bg-[#0A0A0F] px-5 py-14 lg:px-10">
      <div className="mx-auto max-w-[1080px]">
        <header className="text-center">
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-white sm:text-[42px]">
            Unlock Loopinglive — go live today
          </h1>
          <p className="mx-auto mt-3 max-w-[52ch] text-[15.5px] leading-relaxed text-[#A0A0B0]">
            Your webinar is built. Your audience is waiting. One step left.
          </p>
        </header>

        {cancelled && (
          <p className="mx-auto mt-6 max-w-[46ch] rounded-xl bg-[#FFB020]/10 px-4 py-3 text-center text-[13px] text-[#FFB020]">
            Checkout was cancelled — nothing has been charged.
          </p>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.filter((plan) => plan.slug !== "free").map((plan) => (
            <PricingCard
              key={plan.slug}
              plan={plan}
              currentPlan={currentPlan}
              pending={pending === plan.slug}
              onSelect={(slug: PlanSlug) => startCheckout(slug, coupon || undefined)}
            />
          ))}
        </div>

        <div className="mx-auto mt-6 flex max-w-[340px] flex-col items-center gap-3">
          <input
            value={coupon}
            onChange={(event) => setCoupon(event.target.value.toUpperCase())}
            placeholder="Coupon code (optional)"
            className="h-10 w-full rounded-full border border-[#1E1E2E] bg-[#12121A] px-4 text-center text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />
          {error && <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] text-[#6E6E80]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00C851]" />
            30-day money-back guarantee
          </span>
          <span>🔒 Secure payment via Stripe</span>
          <span>💳 All major cards accepted</span>
        </div>

        <figure className="mx-auto mt-14 max-w-[62ch] text-center">
          <blockquote className="text-[17px] leading-relaxed text-[#D4D4DE]">
            &ldquo;I set my webinar up once on a Sunday afternoon. By Wednesday I had
            made six sales while I was at the gym.&rdquo;
          </blockquote>
          <figcaption className="mt-3 text-[13px] text-[#6E6E80]">
            Marcus T. — Business Coach
          </figcaption>
        </figure>

        <section className="mx-auto mt-14 max-w-[--container-prose]">
          <h2 className="text-center text-[20px] font-semibold tracking-[-0.02em] text-white">
            Questions about billing
          </h2>
          <div className="mx-auto mt-6 max-w-[640px] divide-y divide-[#1E1E2E] rounded-2xl border border-[#1E1E2E] bg-[#12121A]">
            {FAQ.map((item, index) => (
              <div key={item.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  aria-expanded={openFaq === index}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[14px] font-medium text-white"
                >
                  {item.q}
                  <span className="text-[#6C47FF]">{openFaq === index ? "−" : "+"}</span>
                </button>
                {openFaq === index && (
                  <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-[#A0A0B0]">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
