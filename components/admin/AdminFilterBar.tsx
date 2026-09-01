"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AdminFilter } from "@/types";

const FILTERS: { id: AdminFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "real", label: "Real users" },
  { id: "unanswered", label: "Unanswered" },
];

export function AdminFilterBar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  counts,
}: {
  filter: AdminFilter;
  onFilterChange: (filter: AdminFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  counts: { all: number; real: number; unanswered: number };
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full border border-[#1E1E2E] bg-[#12121A]/80 p-1">
        {FILTERS.map((option) => {
          const active = filter === option.id;
          const count = counts[option.id];
          return (
            <button
              key={option.id}
              onClick={() => onFilterChange(option.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors duration-200",
                active
                  ? "bg-[#6C47FF] text-white"
                  : "text-[#A0A0B0] hover:bg-white/5 hover:text-white"
              )}
            >
              {option.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  active ? "bg-white/20" : "bg-white/5",
                  option.id === "unanswered" && count > 0 && !active && "text-[#FF3B3B]"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-full border border-[#1E1E2E] bg-[#12121A]/80 px-4 py-2 focus-within:border-[#6C47FF]/60">
        <Search className="h-3.5 w-3.5 shrink-0 text-[#A0A0B0]" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name"
          aria-label="Search messages by sender name"
          className="w-full bg-transparent text-[12.5px] text-white placeholder:text-[#A0A0B0]/60 focus:outline-none"
        />
      </div>
    </div>
  );
}
