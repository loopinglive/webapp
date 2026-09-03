"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Download } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type Group = {
  key: string;
  errorType: string;
  message: string;
  count: number;
  affectedUsers: number;
  firstSeen: string;
  lastSeen: string;
  pages: string[];
  sampleStack: string | null;
};

type Payload = {
  groups: Group[];
  totalEvents: number;
  days: number;
  truncated: boolean;
};

const RANGES = [1, 7, 30];

export function ErrorLogViewer() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Payload | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/superadmin/errors?days=${days}`, {
      cache: "no-store",
    });
    if (response.ok) setData((await response.json()) as Payload);
    else setData({ groups: [], totalEvents: 0, days, truncated: false });
  }, [days]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-5 px-6 py-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-[#1E1E2E] bg-[#12121A] p-1">
          {RANGES.map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] transition-colors",
                days === option
                  ? "bg-[#FF5A5A] text-white"
                  : "text-[#A0A0B0] hover:text-white"
              )}
            >
              {option === 1 ? "24 hours" : `${option} days`}
            </button>
          ))}
        </div>

        {data && (
          <p className="text-[12.5px] text-[#6E6E80]">
            {data.totalEvents.toLocaleString()} events in {data.groups.length} distinct
            {data.groups.length === 1 ? " problem" : " problems"}
            {data.truncated && " · sample capped at 2,000"}
          </p>
        )}

        <a
          href="/api/superadmin/export?dataset=errors"
          className="ml-auto inline-flex h-8 items-center gap-2 rounded-full border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] hover:text-white"
        >
          <Download className="h-3 w-3" />
          Export
        </a>
      </div>

      {!data ? (
        <SkeletonRows rows={6} columns={4} />
      ) : data.groups.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No errors logged"
          description={`Nothing has been caught in the last ${data.days === 1 ? "24 hours" : `${data.days} days`}. Client-side render failures and their stack traces would appear here.`}
        />
      ) : (
        <ul className="space-y-2">
          {data.groups.map((group) => (
            <li
              key={group.key}
              className="overflow-hidden rounded-xl border border-[#1E1E2E] bg-[#12121A]"
            >
              <button
                onClick={() =>
                  setExpanded(expanded === group.key ? null : group.key)
                }
                aria-expanded={expanded === group.key}
                className="flex w-full items-start gap-3 px-4 py-3 text-left"
              >
                <span className="mt-0.5 shrink-0 rounded-md bg-[#FF5A5A]/12 px-2 py-1 font-mono text-[11px] tabular-nums text-[#FF6B6B]">
                  {group.count}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-white">
                    {group.message}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-[#6E6E80]">
                    <code className="text-[#00D4FF]">{group.errorType}</code>
                    {" · "}
                    {group.affectedUsers === 0
                      ? "no signed-in users"
                      : `${group.affectedUsers} user${group.affectedUsers === 1 ? "" : "s"}`}
                    {" · last "}
                    {new Date(group.lastSeen).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </span>

                <ChevronDown
                  className={cn(
                    "mt-1 h-3.5 w-3.5 shrink-0 text-[#6E6E80] transition-transform",
                    expanded === group.key && "rotate-180"
                  )}
                />
              </button>

              {expanded === group.key && (
                <div className="border-t border-[#1E1E2E] px-4 py-3">
                  <dl className="grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="text-[#6E6E80]">First seen</dt>
                      <dd className="text-[#A0A0B0]">
                        {new Date(group.firstSeen).toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-[#6E6E80]">Last seen</dt>
                      <dd className="text-[#A0A0B0]">
                        {new Date(group.lastSeen).toLocaleString()}
                      </dd>
                    </div>
                  </dl>

                  {group.pages.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E80]">
                        Pages
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {group.pages.map((page) => (
                          <li key={page} className="truncate font-mono text-[11.5px] text-[#A0A0B0]">
                            {page}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {group.sampleStack && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E80]">
                        Stack
                      </p>
                      <pre className="mt-1 max-h-[240px] overflow-auto rounded-lg border border-[#1E1E2E] bg-[#0B0B12] p-3 font-mono text-[11px] leading-relaxed text-[#A0A0B0]">
                        {group.sampleStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
