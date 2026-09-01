"use client";

import { SEGMENT_META, WATCHED_SEGMENTS, type Segment } from "@/lib/segments";
import { cn } from "@/lib/utils";
import type { SegmentCounts } from "@/types";

const WATCHED_FILTER = WATCHED_SEGMENTS.join(",");

export function AttendeeSegmentTabs({
  segments,
  active,
  onSelect,
}: {
  segments: SegmentCounts;
  active: string;
  onSelect: (segment: string) => void;
}) {
  const watchedTotal = WATCHED_SEGMENTS.reduce(
    (sum, segment) => sum + (segments[segment] ?? 0),
    0
  );

  const tabs = [
    { id: "all", label: "All", count: segments.total },
    { id: "REGISTERED", label: "Registered", count: segments.REGISTERED ?? 0 },
    { id: "NO_SHOW", label: "No show", count: segments.NO_SHOW ?? 0 },
    { id: WATCHED_FILTER, label: "Watched", count: watchedTotal },
    {
      id: "CLICKED_OFFER",
      label: "Clicked offer",
      count: segments.CLICKED_OFFER ?? 0,
    },
    { id: "BOUGHT", label: "Bought", count: segments.BOUGHT ?? 0 },
  ];

  // The depth breakdown only appears once you are looking at watchers.
  const showDepth = active === WATCHED_FILTER || WATCHED_SEGMENTS.includes(active as Segment);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-full border border-[#1E1E2E] bg-[#12121A] p-1">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors duration-200",
                selected
                  ? "bg-[#6C47FF] text-white"
                  : "text-[#A0A0B0] hover:bg-white/5 hover:text-white"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  selected ? "bg-white/20" : "bg-white/5"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {showDepth && (
        <div className="flex flex-wrap items-center gap-1.5 pl-1">
          <span className="text-[11px] text-[#A0A0B0]">Depth:</span>
          {WATCHED_SEGMENTS.map((segment) => {
            const meta = SEGMENT_META[segment];
            const selected = active === segment;
            return (
              <button
                key={segment}
                onClick={() => onSelect(selected ? WATCHED_FILTER : segment)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors duration-200",
                  selected ? "text-white" : "border-[#2A2A3A] text-[#A0A0B0] hover:text-white"
                )}
                style={
                  selected
                    ? { borderColor: meta.colour, background: `${meta.colour}20` }
                    : undefined
                }
              >
                {meta.label}
                <span className="ml-1.5 tabular-nums opacity-70">
                  {segments[segment] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
