"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import {
  ChatActivityChart,
  OfferClickChart,
  ViewerTimeline,
} from "@/components/analytics/charts";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { StatTile } from "@/components/analytics/StatTile";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import type { SessionAnalytics as Payload } from "@/lib/analytics/session";
import { formatOffset } from "@/lib/utils";

export function SessionAnalytics({
  webinarId,
  sessionId,
}: {
  webinarId: string;
  sessionId: string;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/admin/analytics/session?sessionId=${sessionId}`,
          { cache: "no-store" }
        );
        if (!response.ok || cancelled) return;
        setData((await response.json()) as Payload);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="grid h-[60dvh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid h-[60dvh] place-items-center px-6 text-center">
        <p className="text-[14px] text-[#A0A0B0]">This session could not be found.</p>
      </div>
    );
  }

  const { totals } = data;

  return (
    <>
      <SectionHeader
        title={new Date(data.session.startsAt).toLocaleString()}
        description={`${data.webinar.title} · ${data.session.status}`}
        action={
          <Link
            href={`/admin/webinar/${webinarId}/analytics`}
            className="inline-flex items-center gap-2 text-[13px] text-[#A0A0B0] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All sessions
          </Link>
        }
      />

      <div className="space-y-5 px-6 py-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Registered" value={totals.registered.toLocaleString()} />
          <StatTile label="Attended" value={totals.attended.toLocaleString()} />
          <StatTile label="Peak viewers" value={totals.peakViewers.toLocaleString()} />
          <StatTile
            label="Messages"
            value={totals.messages.toLocaleString()}
            hint={`${totals.realMessages} from real attendees`}
          />
          <StatTile label="Offer clicks" value={totals.clicks.toLocaleString()} />
          <StatTile label="Bought" value={totals.bought.toLocaleString()} />
        </div>

        <p className="text-[11.5px] text-[#6A6A80]">
          Every chart below is on the video&rsquo;s own clock, so they line up with
          each other and with the timed comment editor.
        </p>

        <div className="grid gap-5 xl:grid-cols-2">
          <ViewerTimeline
            data={data.viewers}
            fromSnapshots={data.fromSnapshots}
            dropOffs={data.dropOffs}
          />
          <ChatActivityChart data={data.chat} />
          <OfferClickChart
            data={data.offerClicks}
            revealOffset={data.offerRevealOffset}
          />

          <ChartFrame
            title="Moments worth looking at"
            note="Where people left, and where the chat was busiest."
            empty={
              data.dropOffs.length || data.peaks.length
                ? null
                : "Not enough activity in this session to pick out moments."
            }
          >
            <div className="space-y-4">
              {data.dropOffs.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FF3B3B]">
                    Biggest drop-offs
                  </p>
                  <ul className="space-y-1.5">
                    {data.dropOffs.map((drop) => (
                      <li
                        key={drop.offset}
                        className="flex items-center justify-between gap-3 text-[12.5px]"
                      >
                        <Link
                          href={`/admin/webinar/${webinarId}/comments`}
                          className="font-mono tabular-nums text-white transition-colors hover:text-[#6C47FF]"
                        >
                          {formatOffset(drop.offset)}
                        </Link>
                        <span className="text-[#A0A0B0]">
                          {drop.lost} left
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.peaks.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#00C851]">
                    Peak engagement
                  </p>
                  <ul className="space-y-1.5">
                    {data.peaks.map((peak) => (
                      <li
                        key={peak.offset}
                        className="flex items-center justify-between gap-3 text-[12.5px]"
                      >
                        <Link
                          href={`/admin/webinar/${webinarId}/comments`}
                          className="font-mono tabular-nums text-white transition-colors hover:text-[#6C47FF]"
                        >
                          {formatOffset(peak.offset)}
                        </Link>
                        <span className="text-[#A0A0B0]">
                          {peak.messages} messages
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ChartFrame>
        </div>
      </div>
    </>
  );
}
