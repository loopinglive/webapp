"use client";

import { cn } from "@/lib/utils";

const SWATCHES = [
  "#6C47FF",
  "#00D4FF",
  "#00C851",
  "#FF9500",
  "#FF3B3B",
  "#FFD93D",
  "#C77DFF",
  "#FFFFFF",
];

export function ColourPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (colour: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SWATCHES.map((swatch) => (
        <button
          key={swatch}
          type="button"
          onClick={() => onChange(swatch)}
          aria-label={`Use ${swatch}`}
          style={{ background: swatch }}
          className={cn(
            "h-7 w-7 rounded-full transition-transform duration-200 hover:scale-110",
            value.toLowerCase() === swatch.toLowerCase()
              ? "ring-2 ring-white ring-offset-2 ring-offset-[#12121A]"
              : "ring-1 ring-white/15"
          )}
        />
      ))}

      <label className="flex h-9 items-center gap-2 rounded-full border border-[#2A2A3A] bg-[#1A1A2A] pl-2 pr-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
          aria-label="Custom colour"
        />
        <span className="font-mono text-[11.5px] uppercase text-[#A0A0B0]">
          {value}
        </span>
      </label>
    </div>
  );
}
