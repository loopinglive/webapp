import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PLANS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
            Pricing
          </span>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">
            One price. Every feature. No seat maths.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <GlassPanel
              key={plan.id}
              strong={plan.highlight}
              className={cn(
                "relative flex flex-col p-8",
                plan.highlight && "lg:-my-4 lg:py-12 border-accent/40"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                  Most popular
                </span>
              )}

              <h3 className="text-[15px] font-semibold tracking-tight">
                {plan.name}
              </h3>
              <p className="mt-1.5 text-[13.5px] text-ink-muted">{plan.blurb}</p>

              <div className="mt-7 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-[-0.03em]">
                  {plan.price === 0 ? "$0" : formatCurrency(plan.price)}
                </span>
                <span className="text-[13px] text-ink-faint">
                  {plan.cadence}
                </span>
              </div>

              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" />
                    <span className="text-[13.5px] leading-relaxed text-ink-muted">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href="/signup" className="mt-8 block">
                <Button
                  variant={plan.highlight ? "primary" : "secondary"}
                  size="lg"
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </GlassPanel>
          ))}
        </div>
      </div>
    </section>
  );
}
