"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { useIsHydrated } from "@/hooks/useIsHydrated";
import { timezoneList } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export function TimezoneSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (timezone: string) => void;
}) {
  const hydrated = useIsHydrated();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const zones = useMemo(() => (hydrated ? timezoneList() : ["UTC"]), [hydrated]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? zones.filter((zone) => zone.toLowerCase().includes(needle))
      : zones;
    return filtered.slice(0, 120);
  }, [zones, query]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3.5 text-[13.5px] text-white transition-colors hover:border-[#3A3A4A] focus:border-[#6C47FF] focus:outline-none"
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[#A0A0B0] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-[#2A2A3A] bg-[#12121A] shadow-[0_28px_70px_-20px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 border-b border-[#1E1E2E] px-3.5 py-2.5">
            <Search className="h-3.5 w-3.5 text-[#A0A0B0]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search timezones"
              className="w-full bg-transparent text-[13px] text-white placeholder:text-[#A0A0B0]/60 focus:outline-none"
            />
          </div>

          <ul className="max-h-[240px] overflow-y-auto py-1">
            {results.map((zone) => (
              <li key={zone}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(zone);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-[12.5px] transition-colors",
                    zone === value
                      ? "bg-[#6C47FF]/15 text-white"
                      : "text-[#A0A0B0] hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="truncate">{zone}</span>
                  {zone === value && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#6C47FF]" />
                  )}
                </button>
              </li>
            ))}
            {!results.length && (
              <li className="px-3.5 py-6 text-center text-[12.5px] text-[#A0A0B0]">
                No timezone matches that.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
