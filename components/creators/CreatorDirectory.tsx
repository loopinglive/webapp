"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { CreatorCard, type CreatorSummary } from "@/components/creators/CreatorCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";

const SORTS = [
  { value: "followers", label: "Most followed" },
  { value: "webinars", label: "Most webinars" },
  { value: "newest", label: "Newest" },
] as const;

export function CreatorDirectory() {
  const [creators, setCreators] = useState<CreatorSummary[] | null>(null);
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("followers");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ sort });
    if (search.trim()) params.set("search", search.trim());
    if (niche.trim()) params.set("niche", niche.trim());

    const response = await fetch(`/api/creators/directory?${params}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { creators: CreatorSummary[] };
      setCreators(payload.creators);
    } else {
      setCreators([]);
    }
  }, [search, niche, sort]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search creators…"
            className="h-10 w-full rounded-lg border border-hairline bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>
        <input
          value={niche}
          onChange={(event) => setNiche(event.target.value)}
          placeholder="Filter by niche…"
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          className="h-10 rounded-lg border border-hairline bg-surface px-2.5 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {!creators ? (
          <SkeletonRows rows={4} columns={3} />
        ) : creators.length === 0 ? (
          <EmptyState
            icon="🌱"
            title="No creators found"
            description="Try a different search or niche — or check back once more hosts make their profile public."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
