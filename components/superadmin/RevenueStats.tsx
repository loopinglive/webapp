"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";

import { ChartFrame } from "@/components/analytics/ChartFrame";
import { StatTile } from "@/components/analytics/StatTile";
import { CHART, seriesColour } from "@/lib/analytics/palette";

type Data = {
  counts: { total: number; free: number; monthly: number; yearly: number; lifetime: number };
  paidUsers: number;
  mrr: number;
  arr: number;
  totalRevenue: number;
  arpu: number;
  churnRate: number;
  freeToPaid: number;
  newSignups: { today: number; month: number };
  months: { month: string; revenue: number; signups: number }[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function RevenueStats() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/superadmin/revenue", { cache: "no-store" });
      if (response.ok) setData((await response.json()) as Data);
    })();
  }, []);

  if (!data) {
    return (
      <div className="grid h-[50dvh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  const distribution = [
    { name: "Free", value: data.counts.free },
    { name: "Monthly", value: data.counts.monthly },
    { name: "Yearly", value: data.counts.yearly },
    { name: "Lifetime", value: data.counts.lifetime },
  ].filter((slice) => slice.value > 0);

  const hasRevenue = data.months.some((month) => month.revenue > 0);

  return (
    <div className="space-y-5 px-6 py-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="MRR" value={money(data.mrr)} hint="recurring only" />
        <StatTile label="ARR" value={money(data.arr)} />
        <StatTile label="Total revenue" value={money(data.totalRevenue)} />
        <StatTile label="Paid users" value={data.paidUsers.toLocaleString()} />
        <StatTile label="ARPU" value={money(data.arpu)} />
        <StatTile label="Free → paid" value={`${data.freeToPaid}%`} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total users" value={data.counts.total.toLocaleString()} />
        <StatTile label="New today" value={data.newSignups.today.toLocaleString()} />
        <StatTile label="New this month" value={data.newSignups.month.toLocaleString()} />
        <StatTile label="Churn" value={`${data.churnRate}%`} tone="up-bad" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartFrame
          title="Revenue by month"
          note="Payments received, not recognised revenue."
          empty={hasRevenue ? null : "No payments recorded yet."}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.months} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: CHART.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
              />
              <YAxis
                tick={{ fill: CHART.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,.03)" }}
                contentStyle={{
                  background: CHART.surface,
                  border: `1px solid ${CHART.grid}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: CHART.ink }}
                formatter={(value) => [money(Number(value)), "Revenue"]}
              />
              <Bar dataKey="revenue" fill={seriesColour(0)} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame
          title="New signups by month"
          note="Accounts created, on any plan."
          empty={data.counts.total ? null : "No accounts yet."}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.months} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: CHART.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
              />
              <YAxis
                tick={{ fill: CHART.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,.03)" }}
                contentStyle={{
                  background: CHART.surface,
                  border: `1px solid ${CHART.grid}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: CHART.ink }}
              />
              <Bar dataKey="signups" fill={seriesColour(5)} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <ChartFrame
        title="Plan distribution"
        note="Active accounts by plan."
        empty={distribution.length ? null : "No accounts to break down yet."}
      >
        <div className="flex flex-wrap items-center gap-8">
          <ResponsiveContainer width={220} height={200}>
            <PieChart>
              <Pie
                data={distribution}
                dataKey="value"
                nameKey="name"
                innerRadius={54}
                outerRadius={82}
                paddingAngle={2}
                stroke={CHART.surface}
                strokeWidth={2}
              >
                {distribution.map((slice, index) => (
                  <Cell key={slice.name} fill={seriesColour(index)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: CHART.surface,
                  border: `1px solid ${CHART.grid}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <ul className="space-y-2">
            {distribution.map((slice, index) => (
              <li key={slice.name} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: seriesColour(index) }}
                />
                <span className="text-white">{slice.name}</span>
                <span className="ml-auto tabular-nums text-[#A0A0B0]">{slice.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </ChartFrame>
    </div>
  );
}
