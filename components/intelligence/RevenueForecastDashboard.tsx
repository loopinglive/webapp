"use client";

import { useState } from "react";
import { Loader2, Minus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRevenueForecast } from "@/hooks/useRevenueForecast";
import type { Forecast } from "@/lib/intelligence/forecasting";
import { cn } from "@/lib/utils";

const money = (amount: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export function RevenueForecastDashboard() {
  const { latest, loading, breakdown, generating, error, generate } = useRevenueForecast();
  const [periodDays, setPeriodDays] = useState(30);

  return (
    <>
      <PageHeader
        title="Revenue Forecast"
        subtitle="A statistical projection from your own registration, attendance and purchase history — not a promise."
        action={
          <div className="flex items-center gap-2">
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="h-10 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3 text-[13px] text-white focus:border-[#6C47FF] focus:outline-none"
            >
              {PERIODS.map((p) => (
                <option key={p.days} value={p.days}>
                  Next {p.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => void generate(periodDays)}
              disabled={generating}
              className="flex h-10 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[13px] font-semibold text-white shadow-[0_10px_30px_-10px_#6C47FF] transition-colors hover:bg-[#7C5AFF] disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {generating ? "Forecasting…" : "Generate forecast"}
            </button>
          </div>
        }
      />

      <div className="px-6 py-8 lg:px-10">
        {error && <p className="mb-4 text-[12.5px] text-[#FF3B3B]">{error}</p>}

        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : !latest ? (
          <EmptyState
            icon="📈"
            title="No forecast yet"
            description="Generate one from your account's registration and purchase history."
          />
        ) : (
          <>
            <p className="mb-5 text-[12.5px] text-[#6A6A80]">
              Across all your webinars · next {latest.forecast_period.replace("next_", "").replace("_days", " days")}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile
                label="Predicted revenue"
                value={money(latest.predicted_revenue ?? 0)}
                sub={
                  latest.confidence_interval_low !== null && latest.confidence_interval_high !== null
                    ? `${money(latest.confidence_interval_low)} – ${money(latest.confidence_interval_high)}`
                    : undefined
                }
                forecast={breakdown?.revenue}
              />
              <MetricTile label="Predicted registrants" value={String(latest.predicted_registrants ?? 0)} forecast={breakdown?.registrants} />
              <MetricTile label="Predicted attendees" value={String(latest.predicted_attendees ?? 0)} forecast={breakdown?.attendees} />
              <MetricTile label="Predicted purchases" value={String(latest.predicted_conversions ?? 0)} forecast={breakdown?.conversions} />
            </div>

            {breakdown && Math.min(...Object.values(breakdown).map((b) => b.observedDays)) < 14 && (
              <p className="mt-5 text-[12px] text-[#FF9500]">
                This is based on fewer than 14 days of activity — treat it as a rough direction, not a firm number.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

function MetricTile({
  label,
  value,
  sub,
  forecast,
}: {
  label: string;
  value: string;
  sub?: string;
  forecast?: Forecast;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-white">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-[#6A6A80]">{sub}</p>}
      {forecast && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-[11px] font-medium",
            forecast.trend === "up" ? "text-[#00C851]" : forecast.trend === "down" ? "text-[#FF3B3B]" : "text-[#6A6A80]"
          )}
        >
          {forecast.trend === "up" ? (
            <TrendingUp className="h-3 w-3" />
          ) : forecast.trend === "down" ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {forecast.trend === "up" ? "Trending up" : forecast.trend === "down" ? "Trending down" : "Flat"}
        </div>
      )}
    </div>
  );
}
