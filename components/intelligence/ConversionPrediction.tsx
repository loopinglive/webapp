"use client";

import { cn } from "@/lib/utils";

/** Side-by-side conversion-likelihood and churn-risk gauges for one attendee. */
export function ConversionPrediction({
  conversionLikelihood,
  churnRisk,
}: {
  conversionLikelihood: number;
  churnRisk: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Gauge
        label="Likely to buy"
        value={conversionLikelihood}
        color={conversionLikelihood >= 60 ? "#00C851" : conversionLikelihood >= 30 ? "#FF9500" : "#6A6A80"}
      />
      <Gauge
        label="Churn risk"
        value={churnRisk}
        color={churnRisk >= 60 ? "#FF3B3B" : churnRisk >= 30 ? "#FF9500" : "#00C851"}
      />
    </div>
  );
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-[#A0A0B0]">{label}</span>
        <span
          className={cn("text-[13px] font-semibold tabular-nums")}
          style={{ color }}
        >
          {value}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#1A1A2A]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
