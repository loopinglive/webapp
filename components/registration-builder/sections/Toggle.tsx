"use client";

import { cn } from "@/lib/utils";

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-[12.5px] text-white">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[#A0A0B0]">
            {hint}
          </span>
        )}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-[#6C47FF]" : "bg-[#3A3A4A]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-200",
            checked ? "left-[18px]" : "left-0.5"
          )}
        />
      </button>
    </label>
  );
}
