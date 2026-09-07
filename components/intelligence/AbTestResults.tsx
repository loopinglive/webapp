"use client";

import { Crown } from "lucide-react";

import type { AbTest, AbTestResults as Results } from "@/hooks/useAbTests";
import { cn } from "@/lib/utils";

export function AbTestResults({ test, results }: { test: AbTest; results: Results }) {
  const max = Math.max(1, ...results.variants.map((v) => v.conversionRate));

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {results.variants.map((variant) => {
          const label = variant.variant === "a" ? "A" : "B";
          const content =
            variant.variant === "a" ? test.variant_a.text : test.variant_b.text;
          const isWinner = results.winner === variant.variant;

          return (
            <div
              key={variant.variant}
              className={cn(
                "rounded-lg border px-3.5 py-3",
                isWinner ? "border-[#00C851]/50 bg-[#00C851]/5" : "border-[#1E1E2E] bg-[#12121A]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#A0A0B0]">
                  Variant {label}
                </span>
                {isWinner && (
                  <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[#00C851]">
                    <Crown className="h-3 w-3" />
                    Winner
                  </span>
                )}
              </div>
              {content && (
                <p className="mt-1 line-clamp-2 text-[12.5px] text-[#C8C8D4]">{content}</p>
              )}
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-xl font-semibold tabular-nums text-white">
                  {variant.conversionRate}%
                </span>
                <span className="text-[11px] text-[#6A6A80]">
                  {variant.conversions}/{variant.impressions} converted
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1A1A2A]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6C47FF] to-[#00D4FF]"
                  style={{ width: `${(variant.conversionRate / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11.5px] text-[#6A6A80]">
        {results.significance.significant
          ? `Statistically significant at ${results.significance.confidenceLevel}% confidence.`
          : results.variants.every((v) => v.impressions >= 30)
            ? `Not yet significant (${results.significance.confidenceLevel}% confidence) — the gap could still be noise.`
            : "Needs at least 30 registrants per variant before a result means anything."}
      </p>
    </div>
  );
}
