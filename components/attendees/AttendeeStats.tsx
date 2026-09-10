"use client";

import { WATCHED_SEGMENTS } from "@/lib/segments";
import { cn } from "@/lib/utils";
import type { SegmentCounts } from "@/types";

const CARDS = [
  // See SEGMENT_META in lib/segments.ts — this bucket is "signed up, session
  // has not run yet", which is not the same thing as the total signup count
  // in the header above it.
  { id: "REGISTERED", label: "Awaiting session", colour: "#6C47FF" },
  { id: "NO_SHOW", label: "No show", colour: "#FF9500" },
  { id: "WATCHED", label: "Watched", colour: "#00D4FF" },
  { id: "CLICKED_OFFER", label: "Clicked offer", colour: "#FFD93D" },
  { id: "BOUGHT", label: "Bought", colour: "#00C851" },
] as const;

export function AttendeeStats({
  segments,
  active,
  onSelect,
}: {
  segments: SegmentCounts;
  active: string;
  onSelect: (segment: string) => void;
}) {
  const watched = WATCHED_SEGMENTS.reduce(
    (sum, segment) => sum + (segments[segment] ?? 0),
    0
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => {
        const count =
          card.id === "WATCHED" ? watched : (segments[card.id] ?? 0);
        const share = segments.total
          ? Math.round((count / segments.total) * 100)
          : 0;
        const filter =
          card.id === "WATCHED" ? WATCHED_SEGMENTS.join(",") : card.id;
        const selected = active === filter;

        return (
          <button
            key={card.id}
            onClick={() => onSelect(selected ? "all" : filter)}
            className={cn(
              "rounded-xl border bg-surface px-4 py-3.5 text-left transition-colors duration-200",
              selected ? "border-transparent" : "border-hairline hover:border-surface-3"
            )}
            style={selected ? { borderColor: card.colour } : undefined}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: card.colour }}
            >
              {card.label}
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-ink">
                {count.toLocaleString()}
              </span>
              <span className="text-[11.5px] tabular-nums text-ink-muted">
                {share}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
