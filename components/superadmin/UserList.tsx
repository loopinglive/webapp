"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
  StickyNote,
} from "lucide-react";

import { PLANS } from "@/lib/billing/plans";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  full_name: string;
  email: string;
  plan_slug: string;
  subscription_status: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  admin_note: string | null;
  created_at: string;
  last_login_at: string | null;
  webinars: number;
};

type Payload = {
  users: Row[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

const PLAN_COLOUR: Record<string, string> = {
  free: "#6E6E80",
  monthly: "#00D4FF",
  yearly: "#6C47FF",
  lifetime: "#00C851",
};

const COLUMNS = [
  { key: "full_name", label: "User", sortable: true },
  { key: "plan_slug", label: "Plan", sortable: true },
  { key: "status", label: "Status", sortable: false },
  { key: "webinars", label: "Webinars", sortable: false },
  { key: "created_at", label: "Joined", sortable: true },
  { key: "last_login_at", label: "Last seen", sortable: true },
] as const;

/**
 * The user list.
 *
 * Per-row actions moved to the detail page. A dropdown that grants a lifetime
 * plan should not sit one mis-click away in a dense table, and the actions
 * belong next to the context that justifies them.
 */
export function UserList() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      plan,
      status,
      page: String(page),
      sort,
      dir,
      limit: "50",
    });
    if (query.trim()) params.set("q", query.trim());

    const response = await fetch(`/api/superadmin/users?${params}`, {
      cache: "no-store",
    });
    if (response.ok) setData((await response.json()) as Payload);
    setLoading(false);
  }, [plan, status, page, sort, dir, query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  function toggleSort(key: string) {
    if (sort === key) {
      setDir(dir === "asc" ? "desc" : "asc");
      return;
    }
    setSort(key);
    setDir("desc");
    setPage(1);
  }

  const from = data ? (data.page - 1) * data.limit + 1 : 0;
  const to = data ? Math.min(data.page * data.limit, data.total) : 0;

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E6E80]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            className="h-9 w-[240px] rounded-full border border-[#1E1E2E] bg-[#12121A] pl-9 pr-4 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />
        </div>

        <select
          value={plan}
          onChange={(event) => {
            setPlan(event.target.value);
            setPage(1);
          }}
          className="h-9 rounded-full border border-[#1E1E2E] bg-[#12121A] px-3 text-[13px] text-white focus:outline-none"
        >
          <option value="all">All plans</option>
          {PLANS.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="h-9 rounded-full border border-[#1E1E2E] bg-[#12121A] px-3 text-[13px] text-white focus:outline-none"
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="past_due">Past due</option>
        </select>

        {loading && <Loader2 className="h-4 w-4 animate-spin text-[#6C47FF]" />}

        <a
          href="/api/superadmin/export?dataset=users"
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-full border border-[#1E1E2E] px-3.5 text-[12.5px] text-[#A0A0B0] hover:text-white"
        >
          <Download className="h-3 w-3" />
          Export CSV
        </a>
      </div>

      {!data ? (
        <SkeletonRows rows={10} columns={6} />
      ) : data.users.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nobody matches those filters"
          description="Try clearing the search, or widening the plan and status filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[#1E1E2E]">
            <table className="w-full min-w-[840px]">
              <thead className="bg-[#12121A]">
                <tr>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]"
                    >
                      {column.sortable ? (
                        <button
                          onClick={() => toggleSort(column.key)}
                          className={cn(
                            "inline-flex items-center gap-1 transition-colors hover:text-white",
                            sort === column.key && "text-white"
                          )}
                        >
                          {column.label}
                          {sort === column.key &&
                            (dir === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            ))}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E2E]">
                {data.users.map((user) => (
                  <tr
                    key={user.id}
                    className={cn(
                      "transition-colors hover:bg-white/[.02]",
                      user.is_suspended && "opacity-50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/superadmin/users/${user.id}`}
                        className="text-[13px] font-medium text-white hover:text-[#6C47FF]"
                      >
                        {user.full_name || "—"}
                      </Link>
                      {user.is_admin && (
                        <span className="ml-2 rounded-full bg-[#FF5A5A]/15 px-2 py-0.5 text-[10px] text-[#FF5A5A]">
                          admin
                        </span>
                      )}
                      {user.admin_note && (
                        <StickyNote
                          className="ml-1.5 inline h-3 w-3 text-[#FFB020]"
                          aria-label="Has an admin note"
                        />
                      )}
                      <p className="text-[11.5px] text-[#6E6E80]">{user.email}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] capitalize"
                        style={{
                          color: PLAN_COLOUR[user.plan_slug] ?? "#A0A0B0",
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        {user.plan_slug}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-[12px] text-[#A0A0B0]">
                      {user.is_suspended ? (
                        <span
                          className="text-[#FF6B6B]"
                          title={user.suspended_reason ?? undefined}
                        >
                          Suspended
                        </span>
                      ) : (
                        (user.subscription_status ?? "active")
                      )}
                    </td>

                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {user.webinars}
                    </td>

                    <td className="px-4 py-3 text-[12px] text-[#6E6E80]">
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </td>

                    <td className="px-4 py-3 text-[12px] text-[#6E6E80]">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })
                        : "never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination. The list was previously capped at 200 rows with
              nothing on screen to say a customer beyond that existed. */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12.5px] text-[#6E6E80]">
              {from}&ndash;{to} of {data.total.toLocaleString()}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1 || loading}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#1E1E2E] px-2.5 text-[12.5px] text-[#A0A0B0] hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <span className="text-[12.5px] tabular-nums text-[#6E6E80]">
                {data.page} / {data.pages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={data.page >= data.pages || loading}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#1E1E2E] px-2.5 text-[12.5px] text-[#A0A0B0] hover:text-white disabled:opacity-30"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
