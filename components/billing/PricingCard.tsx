"use client";

import { Check, X } from "lucide-react";

import type { PlanDefinition } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

export function PricingCard({
  plan,
  onSelect,
  pending,
  currentPlan,
  compact,
}: {
  plan: PlanDefinition;
  onSelect?: (slug: PlanDefinition["slug"]) => void;
  pending?: boolean;
  currentPlan?: string;
  compact?: boolean;
}) {
  const isCurrent = currentPlan === plan.slug;
  const isFree = plan.slug === "free";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-surface transition-all duration-300",
        compact ? "p-5" : "p-7",
        plan.highlight
          ? "border-accent/50 shadow-[0_0_60px_-20px_#6C47FF]"
          : "border-hairline hover:border-surface-3"
      )}
    >
      {plan.badge && (
        <span
          className={cn(
            "absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
            plan.highlight
              ? "bg-gradient-to-r from-accent to-cyan text-white"
              : "bg-hairline text-ink-muted"
          )}
        >
          {plan.badge}
        </span>
      )}

      <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {plan.name}
      </h3>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-semibold tracking-[-0.03em] text-ink",
            compact ? "text-[30px]" : "text-[38px]"
          )}
        >
          {plan.priceDisplay}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-ink-faint">{plan.cadence}</p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature.text} className="flex items-start gap-2.5">
            {feature.included ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00C851]" />
            ) : (
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
            )}
            <span
              className={cn(
                "text-[13px] leading-relaxed",
                feature.included ? "text-[#D4D4DE]" : "text-ink-faint"
              )}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect?.(plan.slug)}
        disabled={pending || isCurrent || (isFree && !onSelect)}
        className={cn(
          "mt-6 h-11 w-full rounded-full text-[14px] font-semibold transition-all duration-200 disabled:cursor-default disabled:opacity-50",
          isCurrent
            ? "border border-surface-3 text-ink-muted"
            : plan.slug === "lifetime"
              ? "bg-gradient-to-r from-accent to-cyan text-white hover:opacity-90"
              : plan.highlight
                ? "bg-accent text-white shadow-[0_12px_36px_-10px_#6C47FF] hover:bg-accent-soft"
                : "border border-surface-3 text-ink hover:border-accent/50"
        )}
      >
        {isCurrent
          ? "Your current plan"
          : pending
            ? "One moment…"
            : isFree
              ? "Start free"
              : plan.slug === "lifetime"
                ? "Get lifetime access"
                : `Start ${plan.name}`}
      </button>
    </div>
  );
}
