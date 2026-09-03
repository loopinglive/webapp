"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollText, UserCog } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";

type Entry = {
  id: string;
  at: string;
  kind: "action" | "impersonation";
  admin: string;
  target: string | null;
  targetId: string | null;
  action: string;
  detail: unknown;
};

/** Renders a detail blob as readable key/value pairs rather than raw JSON. */
function describe(detail: unknown) {
  if (!detail || typeof detail !== "object") return null;
  const entries = Object.entries(detail as Record<string, unknown>).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );
  if (!entries.length) return null;

  return entries
    .map(([key, value]) => `${key.replace(/([A-Z])/g, " $1").toLowerCase()}: ${String(value)}`)
    .join(" · ");
}

export function AuditLog() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch("/api/superadmin/audit", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { entries: Entry[] };
        setEntries(data.entries);
      } else {
        setEntries([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!entries) {
    return (
      <div className="px-6 py-6 lg:px-8">
        <SkeletonRows rows={8} columns={4} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-6 py-10 lg:px-8">
        <EmptyState
          icon="📋"
          title="Nothing recorded yet"
          description="Plan grants, suspensions, email changes, feature flags, affiliate payouts and impersonation sessions all appear here as they happen."
        />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <ul className="space-y-1.5">
        {entries.map((entry) => {
          const detail = describe(entry.detail);
          const impersonation = entry.kind === "impersonation";

          return (
            <li
              key={`${entry.kind}-${entry.id}`}
              className="flex items-start gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
              style={
                impersonation
                  ? { borderLeftColor: "#FF5A5A", borderLeftWidth: 3 }
                  : undefined
              }
            >
              {impersonation ? (
                <UserCog className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF5A5A]" />
              ) : (
                <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6C47FF]" />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-white">
                  <span className="font-medium">{entry.admin}</span>{" "}
                  <span className="text-[#A0A0B0]">{entry.action.replace(/_/g, " ")}</span>
                  {entry.target && (
                    <>
                      {" "}
                      <span className="text-[#6E6E80]">→</span>{" "}
                      {entry.targetId ? (
                        <Link
                          href={`/superadmin/users/${entry.targetId}`}
                          className="text-[#00D4FF] hover:underline"
                        >
                          {entry.target}
                        </Link>
                      ) : (
                        <span>{entry.target}</span>
                      )}
                    </>
                  )}
                </p>

                {detail && (
                  <p className="mt-0.5 text-[11.5px] text-[#6E6E80]">{detail}</p>
                )}
              </div>

              <span className="shrink-0 text-[11px] text-[#6E6E80]">
                {new Date(entry.at).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
