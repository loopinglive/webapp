"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";

import {
  BreakdownBars,
  FunnelChart,
  RetentionCurve,
  TimeSeriesChart,
  TimeSlotHeatmap,
} from "@/components/analytics/charts";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { DateRangePicker, type RangeId } from "@/components/analytics/DateRangePicker";
import { deltaOf, StatTile } from "@/components/analytics/StatTile";
import { AdminButton } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import type { WebinarAnalytics as Payload } from "@/lib/analytics/queries";
import { formatOffset } from "@/lib/utils";

type Response = Payload & {
  webinar: { id: string; title: string; video_duration_seconds: number | null };
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);

export function WebinarAnalytics({ webinarId }: { webinarId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // The range lives in the URL, so a host can share exactly what they see.
  const range = (params.get("range") as RangeId) ?? "30d";
  const [exporting, setExporting] = useState(false);

  // Tagged with the range it was fetched for, so switching ranges never shows
  // the old numbers under the new label.
  const [loaded, setLoaded] = useState<{ key: string; data: Response | null } | null>(
    null
  );
  const key = `${webinarId}:${range}`;
  const fresh = loaded?.key === key ? loaded : null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let payload: Response | null = null;
      try {
        const response = await fetch(
          `/api/admin/analytics/webinar?webinarId=${webinarId}&range=${range}`,
          { cache: "no-store" }
        );
        if (response.ok) payload = (await response.json()) as Response;
      } finally {
        if (!cancelled) setLoaded({ key: `${webinarId}:${range}`, data: payload });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [webinarId, range]);

  const setRange = useCallback(
    (next: RangeId) => {
      const search = new URLSearchParams(params.toString());
      search.set("range", next);
      router.replace(`${pathname}?${search}`, { scroll: false });
    },
    [params, pathname, router]
  );

  async function exportCsv() {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/admin/analytics/export?scope=webinar&webinarId=${webinarId}&range=${range}`
      );
      if (!response.ok) return;
      const blob = await response.blob();
      const name =
        (response.headers.get("Content-Disposition") ?? "").match(
          /filename="(.+?)"/
        )?.[1] ?? "analytics.csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (!fresh) {
    return (
      <div className="grid h-[60dvh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  const data = fresh.data;

  if (!data) {
    return (
      <div className="grid h-[60dvh] place-items-center px-6 text-center">
        <p className="text-[14px] text-[#A0A0B0]">
          Could not load analytics for this webinar.
        </p>
      </div>
    );
  }

  const { tiles, capture } = data;
  const duration = data.webinar.video_duration_seconds;

  const deviceNote = capture.deviceFrom
    ? `Covers ${capture.countedRegistrants.toLocaleString()} registrants since ${new Date(capture.deviceFrom).toLocaleDateString()}, when device capture began.`
    : undefined;

  return (
    <>
      <SectionHeader
        title="Analytics"
        description={data.webinar.title}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker value={range} onChange={setRange} />
            <AdminButton variant="secondary" onClick={exportCsv} disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export
            </AdminButton>
          </div>
        }
      />

      <div className="space-y-5 px-6 py-6 lg:px-8">
        {/* Tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          <StatTile
            label="Registered"
            value={tiles.registrations.toLocaleString()}
            delta={deltaOf(tiles.registrations, tiles.previous.registrations)}
          />
          <StatTile
            label="Attended"
            value={tiles.attendees.toLocaleString()}
            delta={deltaOf(tiles.attendees, tiles.previous.attendees)}
          />
          <StatTile label="No-show" value={`${tiles.noShowRate}%`} tone="up-bad" />
          <StatTile
            label="Avg watch"
            value={`${tiles.avgWatchPercentage}%`}
            hint={formatOffset(tiles.avgWatchSeconds)}
          />
          <StatTile label="Offer CTR" value={`${tiles.offerCtr}%`} />
          <StatTile
            label="Conversion"
            value={`${tiles.conversionRate}%`}
            delta={deltaOf(tiles.conversionRate, tiles.previous.conversionRate)}
          />
          <StatTile
            label="Revenue"
            value={money(tiles.revenueCents, tiles.currency)}
            hint={tiles.revenueCents === 0 ? "no priced sales" : undefined}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <TimeSeriesChart data={data.timeline} />
          <RetentionCurve
            data={data.retention}
            biggestDrop={data.biggestDrop}
            durationSeconds={duration}
          />
          <FunnelChart stages={data.funnel} />
          <BreakdownBars
            title="Where they came from"
            note="From the UTM parameters on the link they used."
            data={data.sources}
          />
          <BreakdownBars
            title="Device"
            note={deviceNote}
            data={data.devices}
            categorical
            empty={
              capture.countedRegistrants
                ? null
                : "No device data yet. Registrants from before this was captured are not counted."
            }
          />
          <BreakdownBars
            title="Country"
            note="From the network they joined on — not the country on their phone number."
            data={data.countries.ip}
            empty={
              data.countries.ip.length
                ? null
                : "No location data yet. This is captured from the moment a registration arrives."
            }
          />
        </div>

        <TimeSlotHeatmap data={data.timeSlots} />

        {/* Sessions */}
        <ChartFrame
          title="Session by session"
          note="Which runs performed best."
          empty={data.sessions.length ? null : "No sessions with registrations in this range."}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="text-left">
                  {["Session", "Registered", "Attended", "Attendance", "Avg watch", "Conversion"].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E2E]">
                {data.sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="py-2.5">
                      <Link
                        href={`/admin/webinar/${webinarId}/analytics/${session.id}`}
                        className="text-[12.5px] text-white transition-colors hover:text-[#6C47FF]"
                      >
                        {new Date(session.startsAt).toLocaleString()}
                      </Link>
                    </td>
                    <td className="py-2.5 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {session.registrations}
                    </td>
                    <td className="py-2.5 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {session.attendees}
                    </td>
                    <td className="py-2.5 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {session.attendanceRate}%
                    </td>
                    <td className="py-2.5 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {session.avgWatchPercentage}%
                    </td>
                    <td className="py-2.5 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {session.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartFrame>
      </div>
    </>
  );
}
