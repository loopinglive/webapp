"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One number, with its movement against the previous equivalent window.
 *
 * `pending` renders the tile in place but explicitly unavailable — a metric
 * waiting on Phase 7 must not read as a zero.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
  pending,
  tone,
}: {
  label: string;
  value: string;
  /** Percentage change. Positive is not automatically good — see `tone`. */
  delta?: number | null;
  hint?: string;
  pending?: string;
  tone?: "up-good" | "up-bad";
}) {
  const good = tone === "up-bad" ? (delta ?? 0) < 0 : (delta ?? 0) > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5",
        pending && "opacity-55"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
        {label}
      </p>

      {pending ? (
        <>
          <p className="mt-1.5 text-[15px] font-medium text-[#6A6A80]">—</p>
          <p className="mt-1 text-[10.5px] leading-snug text-[#6A6A80]">
            {pending}
          </p>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-white">
            {value}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {delta !== undefined && delta !== null && delta !== 0 && (
              <span
                className="flex items-center gap-0.5 text-[11px] font-medium tabular-nums"
                style={{ color: good ? "#00C851" : "#FF9500" }}
              >
                {delta > 0 ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {Math.abs(delta)}%
              </span>
            )}
            {hint && <span className="text-[11px] text-[#6A6A80]">{hint}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/** Percent change between two values, or null when there is no baseline. */
export function deltaOf(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
