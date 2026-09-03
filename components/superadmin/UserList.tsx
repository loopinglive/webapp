"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Loader2, Search, UserCog } from "lucide-react";

import { PLANS, type PlanSlug } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  full_name: string;
  email: string;
  plan_slug: string;
  subscription_status: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
  last_login_at: string | null;
  webinars: number;
};

const PLAN_COLOUR: Record<string, string> = {
  free: "#6E6E80",
  monthly: "#00D4FF",
  yearly: "#6C47FF",
  lifetime: "#00C851",
};

export function UserList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ plan, status });
    if (query.trim()) params.set("q", query.trim());

    const response = await fetch(`/api/superadmin/users?${params}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const { users } = (await response.json()) as { users: Row[] };
      setRows(users);
    }
    setLoading(false);
  }, [plan, status, query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  async function grantPlan(userId: string, planSlug: PlanSlug) {
    setBusy(userId);
    const response = await fetch("/api/superadmin/grant-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, planSlug }),
    });
    setBusy(null);
    setNote(response.ok ? `Granted ${planSlug}.` : "Could not grant that plan.");
    setTimeout(() => setNote(null), 3000);
    await load();
  }

  async function toggleSuspend(user: Row) {
    setBusy(user.id);
    const response = await fetch("/api/superadmin/suspend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, suspended: !user.is_suspended }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusy(null);
    setNote(response.ok ? "Updated." : (payload.error ?? "Could not update."));
    setTimeout(() => setNote(null), 3000);
    await load();
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E6E80]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
            className="h-9 w-[240px] rounded-full border border-[#1E1E2E] bg-[#12121A] pl-9 pr-4 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />
        </div>

        <select
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
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
          onChange={(event) => setStatus(event.target.value)}
          className="h-9 rounded-full border border-[#1E1E2E] bg-[#12121A] px-3 text-[13px] text-white focus:outline-none"
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="past_due">Past due</option>
        </select>

        {loading && <Loader2 className="h-4 w-4 animate-spin text-[#6C47FF]" />}
        {note && <span className="text-[12.5px] text-[#00C851]">{note}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1E1E2E]">
        <table className="w-full min-w-[900px]">
          <thead className="bg-[#12121A]">
            <tr>
              {["User", "Plan", "Status", "Webinars", "Joined", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E1E2E]">
            {rows.map((user) => (
              <tr key={user.id} className={cn(user.is_suspended && "opacity-50")}>
                <td className="px-4 py-3">
                  <p className="text-[13px] font-medium text-white">
                    {user.full_name || "—"}
                    {user.is_admin && (
                      <span className="ml-2 rounded-full bg-[#FF5A5A]/15 px-2 py-0.5 text-[10px] text-[#FF5A5A]">
                        admin
                      </span>
                    )}
                  </p>
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
                  {user.is_suspended
                    ? "Suspended"
                    : (user.subscription_status ?? "active")}
                </td>

                <td className="px-4 py-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                  {user.webinars}
                </td>

                <td className="px-4 py-3 text-[12px] text-[#6E6E80]">
                  {new Date(user.created_at).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <select
                      defaultValue=""
                      disabled={busy === user.id}
                      onChange={(event) => {
                        const value = event.target.value as PlanSlug;
                        if (value) void grantPlan(user.id, value);
                        event.target.value = "";
                      }}
                      className="h-8 rounded-lg border border-[#1E1E2E] bg-[#12121A] px-2 text-[11.5px] text-white focus:outline-none"
                    >
                      <option value="">Grant plan…</option>
                      {PLANS.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {!user.is_admin && (
                      <>
                        <button
                          onClick={() => toggleSuspend(user)}
                          disabled={busy === user.id}
                          title={user.is_suspended ? "Unsuspend" : "Suspend"}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[#1E1E2E] text-[#A0A0B0] transition-colors hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A] disabled:opacity-40"
                        >
                          {user.is_suspended ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Ban className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <ImpersonateButton user={user} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && rows.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-[#6E6E80]">
            No users match those filters.
          </p>
        )}
      </div>
    </div>
  );
}

function ImpersonateButton({ user }: { user: Row }) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/superadmin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, reason }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not start.");
      return;
    }
    // A full navigation, not router.push: the impersonation cookie is read by
    // the server layout, which a client-side transition would not re-run.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/dashboard");
  }

  return (
    <>
      <button
        onClick={() => setAsking(true)}
        title="Impersonate"
        className="grid h-8 w-8 place-items-center rounded-lg border border-[#1E1E2E] text-[#A0A0B0] transition-colors hover:border-[#6C47FF]/50 hover:text-white"
      >
        <UserCog className="h-3.5 w-3.5" />
      </button>

      {asking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="w-full max-w-[440px] rounded-2xl border border-[#1E1E2E] bg-[#0D0D15] p-6">
            <h3 className="text-[17px] font-semibold text-white">
              Impersonate {user.full_name || user.email}?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#A0A0B0]">
              You will see their dashboard as they see it. Every action is recorded
              against your account, and the session ends automatically after an hour.
            </p>

            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason (recorded)"
              className="mt-4 h-10 w-full rounded-xl border border-[#1E1E2E] bg-[#12121A] px-3.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
            />

            {error && <p className="mt-2 text-[12.5px] text-[#FF6B6B]">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setAsking(false)}
                className="h-9 rounded-full px-4 text-[13px] text-[#A0A0B0] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={start}
                disabled={busy}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[13px] font-medium text-white hover:bg-[#7C5AFF] disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Start impersonating
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
