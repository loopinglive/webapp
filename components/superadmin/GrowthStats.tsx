"use client";

import { useEffect, useState } from "react";

import { ChartFrame } from "@/components/analytics/ChartFrame";
import { FunnelChart } from "@/components/analytics/charts";
import { StatTile } from "@/components/analytics/StatTile";
import { SkeletonChart, SkeletonTiles } from "@/components/ui/Skeleton";
import { SEQUENTIAL } from "@/lib/analytics/palette";

type Payload = {
  funnel: { label: string; value: number; share: number }[];
  timeToValue: {
    firstWebinarDays: number | null;
    firstRegistrantDays: number | null;
    firstPaymentDays: number | null;
  };
  cohorts: {
    cohort: string;
    cohort_size: number;
    month_offset: number;
    retained: number;
  }[];
  adoption: { label: string; used: number; of: number; share: number }[];
};

const days = (value: number | null) =>
  value === null ? "—" : value === 0 ? "same day" : `${value} day${value === 1 ? "" : "s"}`;

/**
 * Activation and retention.
 *
 * The revenue page reports what was billed. This reports whether the product
 * works — both are needed, and only one of them predicts the other.
 */
export function GrowthStats() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch("/api/superadmin/growth", { cache: "no-store" });
      if (response.ok) setData((await response.json()) as Payload);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!data) {
    return (
      <div className="space-y-5 px-6 py-6 lg:px-8">
        <SkeletonTiles count={3} />
        <SkeletonChart />
      </div>
    );
  }

  // Each stage is a subset of the previous, so ofPrevious is the drop.
  const funnelStages = data.funnel.map((stage, index) => ({
    label: stage.label,
    value: stage.value,
    ofPrevious:
      index === 0 || data.funnel[index - 1].value === 0
        ? null
        : Math.round((stage.value / data.funnel[index - 1].value) * 100),
  }));

  const offsets = [...new Set(data.cohorts.map((row) => row.month_offset))].sort(
    (a, b) => a - b
  );
  const cohortNames = [...new Set(data.cohorts.map((row) => row.cohort))];
  const cellFor = (cohort: string, offset: number) =>
    data.cohorts.find((row) => row.cohort === cohort && row.month_offset === offset);

  return (
    <div className="space-y-5 px-6 py-6 lg:px-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="To first webinar"
          value={days(data.timeToValue.firstWebinarDays)}
          hint="median from signup"
        />
        <StatTile
          label="To first registrant"
          value={days(data.timeToValue.firstRegistrantDays)}
          hint="median from signup"
        />
        <StatTile
          label="To first payment"
          value={days(data.timeToValue.firstPaymentDays)}
          hint="median from signup"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <FunnelChart stages={funnelStages} />

        <ChartFrame
          title="Feature adoption"
          note="What share of webinars, or accounts, actually use each capability."
          empty={
            data.adoption.some((row) => row.of > 0)
              ? null
              : "Nothing to measure yet — no webinars have been created."
          }
        >
          <ul className="space-y-3">
            {data.adoption.map((row) => (
              <li key={row.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-white">{row.label}</span>
                  <span className="text-[12px] tabular-nums text-[#A0A0B0]">
                    {row.used} of {row.of}
                    <span className="ml-2 text-[#6E6E80]">{row.share}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#1A1A2A]">
                  <div
                    className="h-full rounded-full bg-[#6C47FF] transition-[width] duration-500"
                    style={{ width: `${Math.min(100, row.share)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </ChartFrame>
      </div>

      <ChartFrame
        title="Cohort retention"
        note="Of everyone who signed up in a given month, how many paid us in each following month. Counted from invoices, so it reflects what actually happened rather than today's plan."
        empty={
          data.cohorts.length
            ? null
            : "No cohorts to show yet. This fills in once there are signups across more than one month."
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-[520px] border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E80]">
                  Cohort
                </th>
                <th className="pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E80]">
                  Size
                </th>
                {offsets.map((offset) => (
                  <th
                    key={offset}
                    className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E80]"
                  >
                    M{offset}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortNames.map((cohort) => {
                const size = cellFor(cohort, 0)?.cohort_size ?? 0;

                return (
                  <tr key={cohort}>
                    <td className="pr-3 text-[12.5px] whitespace-nowrap text-white">
                      {cohort}
                    </td>
                    <td className="pr-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {size}
                    </td>
                    {offsets.map((offset) => {
                      const cell = cellFor(cohort, offset);
                      if (!cell) {
                        return <td key={offset} className="h-8 w-12" />;
                      }

                      const share = size ? cell.retained / size : 0;
                      // Sequential ramp: darker is a smaller share, so the eye
                      // reads the decay along each row.
                      const step = Math.min(
                        SEQUENTIAL.length - 1,
                        Math.floor(share * (SEQUENTIAL.length - 1))
                      );

                      return (
                        <td
                          key={offset}
                          title={`${cell.retained} of ${size} retained`}
                          className="h-8 w-12 rounded text-center text-[11.5px] tabular-nums"
                          style={{
                            background: SEQUENTIAL[step],
                            color: share > 0.45 ? "#FFFFFF" : "#A0A0B0",
                          }}
                        >
                          {size ? `${Math.round(share * 100)}%` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartFrame>
    </div>
  );
}
