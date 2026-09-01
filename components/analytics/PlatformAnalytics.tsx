"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, MessageCircle, Smartphone } from "lucide-react";

import { ChartFrame } from "@/components/analytics/ChartFrame";
import { TimeSeriesChart } from "@/components/analytics/charts";
import { DateRangePicker, type RangeId } from "@/components/analytics/DateRangePicker";
import { StatTile } from "@/components/analytics/StatTile";

type Payload = {
  totals: {
    webinars: number;
    published: number;
    registrations: number;
    attendees: number;
    purchases: number;
    revenueCents: number;
    currency: string;
    messages: { email: number; sms: number; whatsapp: number };
  };
  timeline: { day: string; registrations: number; attendees: number }[];
  topWebinars: {
    id: string;
    title: string;
    registrations: number;
    attendees: number;
    conversionRate: number;
  }[];
  subscriptions: { pending: string };
};

const PHASE_7 = "Arrives with billing in Phase 7";

export function PlatformAnalytics() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const range = (params.get("range") as RangeId) ?? "30d";

  // Data is tagged with the range it came from, so a switch never renders the
  // previous range's numbers under the new range's label.
  const [loaded, setLoaded] = useState<{ range: string; data: Payload | null } | null>(
    null
  );
  const fresh = loaded?.range === range ? loaded : null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let payload: Payload | null = null;
      try {
        const response = await fetch(
          `/api/admin/analytics/platform?range=${range}`,
          { cache: "no-store" }
        );
        if (response.ok) payload = (await response.json()) as Payload;
      } finally {
        if (!cancelled) setLoaded({ range, data: payload });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const setRange = useCallback(
    (next: RangeId) => {
      const search = new URLSearchParams(params.toString());
      search.set("range", next);
      router.replace(`${pathname}?${search}`, { scroll: false });
    },
    [params, pathname, router]
  );

  if (!fresh) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#0A0A0F]">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </main>
    );
  }

  const data = fresh.data;

  if (!data) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#0A0A0F] px-6 text-center">
        <p className="text-[14px] text-[#A0A0B0]">Could not load platform analytics.</p>
      </main>
    );
  }

  const { totals } = data;
  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: totals.currency,
    maximumFractionDigits: 0,
  }).format(totals.revenueCents / 100);

  return (
    <main className="min-h-dvh bg-[#0A0A0F]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1E1E2E] px-6 py-6 lg:px-10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6C47FF]">
            Super admin
          </p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.025em] text-white">
            Platform analytics
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <Link
            href="/admin/dashboard"
            className="text-[13px] text-[#A0A0B0] transition-colors hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="space-y-6 px-6 py-8 lg:px-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatTile
            label="Webinars"
            value={totals.webinars.toLocaleString()}
            hint={`${totals.published} published`}
          />
          <StatTile label="Registrations" value={totals.registrations.toLocaleString()} />
          <StatTile label="Attendees" value={totals.attendees.toLocaleString()} />
          <StatTile
            label="Purchases"
            value={totals.purchases.toLocaleString()}
          />
          <StatTile label="Revenue" value={money} />
        </div>

        {/* Present, in position, explicitly pending — never faked as zero. */}
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
            Subscriptions
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatTile label="MRR" value="—" pending={PHASE_7} />
            <StatTile label="ARR" value="—" pending={PHASE_7} />
            <StatTile label="New signups" value="—" pending={PHASE_7} />
            <StatTile label="Churn" value="—" pending={PHASE_7} />
            <StatTile label="Free → paid" value="—" pending={PHASE_7} />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <TimeSeriesChart data={data.timeline} />

          <ChartFrame
            title="Messages sent"
            note="Delivered across every webinar in this range."
            empty={
              totals.messages.email + totals.messages.sms + totals.messages.whatsapp
                ? null
                : "No messages sent in this range."
            }
          >
            <ul className="space-y-3">
              {[
                { label: "Email", value: totals.messages.email, icon: Mail },
                { label: "SMS", value: totals.messages.sms, icon: Smartphone },
                { label: "WhatsApp", value: totals.messages.whatsapp, icon: MessageCircle },
              ].map((row) => (
                <li key={row.label} className="flex items-center gap-3">
                  <row.icon className="h-4 w-4 shrink-0 text-[#A0A0B0]" />
                  <span className="text-[13px] text-white">{row.label}</span>
                  <span className="ml-auto text-[13px] font-medium tabular-nums text-white">
                    {row.value.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </ChartFrame>
        </div>

        <ChartFrame
          title="Top performing webinars"
          note="Ranked by conversion, among webinars with at least five attendees."
          empty={
            data.topWebinars.length
              ? null
              : "No webinar has enough attendees yet to rank fairly."
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="text-left">
                  {["Webinar", "Registered", "Attended", "Conversion"].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E2E]">
                {data.topWebinars.map((webinar) => (
                  <tr key={webinar.id}>
                    <td className="py-2.5">
                      <Link
                        href={`/admin/webinar/${webinar.id}/analytics`}
                        className="text-[12.5px] text-white transition-colors hover:text-[#6C47FF]"
                      >
                        {webinar.title}
                      </Link>
                    </td>
                    <td className="py-2.5 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {webinar.registrations}
                    </td>
                    <td className="py-2.5 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {webinar.attendees}
                    </td>
                    <td
                      className="py-2.5 text-[12.5px] font-medium tabular-nums"
                      style={{ color: "#00C851" }}
                      title={`${webinar.attendees} attendees`}
                    >
                      {webinar.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartFrame>
      </div>
    </main>
  );
}
