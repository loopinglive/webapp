"use client";

import { cn } from "@/lib/utils";

export const RANGES = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
] as const;

export type RangeId = (typeof RANGES)[number]["id"];

export function DateRangePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: RangeId) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-[#1E1E2E] bg-[#12121A] p-1">
      {RANGES.map((range) => (
        <button
          key={range.id}
          onClick={() => onChange(range.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] transition-colors",
            value === range.id
              ? "bg-[#6C47FF] text-white"
              : "text-[#A0A0B0] hover:text-white"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
