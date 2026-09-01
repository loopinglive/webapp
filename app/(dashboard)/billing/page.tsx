import type { Metadata } from "next";
import { Check } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PLANS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="You are on the Free plan — features unlock the moment you upgrade."
      />
      <div className="grid gap-4 px-6 py-8 lg:grid-cols-3 lg:px-10">
        {PLANS.map((plan) => (
          <GlassPanel
            key={plan.id}
            strong={plan.highlight}
            className={cn("flex flex-col p-7", plan.highlight && "border-accent/40")}
          >
            <h2 className="text-[15px] font-semibold tracking-tight">
              {plan.name}
            </h2>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-[-0.03em]">
                {plan.price === 0 ? "$0" : formatCurrency(plan.price)}
              </span>
              <span className="text-[13px] text-ink-faint">{plan.cadence}</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" />
                  <span className="text-[13px] leading-relaxed text-ink-muted">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              variant={plan.highlight ? "primary" : "secondary"}
              className="mt-7 w-full"
              disabled={plan.id === "free"}
            >
              {plan.id === "free" ? "Current plan" : plan.cta}
            </Button>
          </GlassPanel>
        ))}
      </div>
    </>
  );
}
