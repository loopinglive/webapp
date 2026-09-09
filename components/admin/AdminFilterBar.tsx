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
      <div className="flex items-center gap-1 rounded-full border border-hairline bg-surface/80 p-1">
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
                  ? "bg-accent text-white"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              )}
            >
              {option.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  active ? "bg-surface-2" : "bg-surface-2",
                  option.id === "unanswered" && count > 0 && !active && "text-[#FF3B3B]"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-full border border-hairline bg-surface/80 px-4 py-2 focus-within:border-accent/60">
        <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name"
          aria-label="Search messages by sender name"
          className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-ink-muted/60 focus:outline-none"
        />
      </div>
    </div>
  );
}
