"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

type Lead = {
  id: string;
  company_name: string;
  full_name: string;
  work_email: string;
  team_size: string | null;
  monthly_sessions: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

type EnterpriseAccount = {
  id: string;
  team_id: string | null;
  team: { name: string; slug: string } | null;
  custom_max_members: number | null;
  custom_max_webinars: number | null;
  custom_price_monthly: number | null;
  contract_end_date: string | null;
};

export function EnterpriseManager() {
  const toast = useToast();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [accounts, setAccounts] = useState<EnterpriseAccount[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [grantTeamId, setGrantTeamId] = useState("");
  const [grantMembers, setGrantMembers] = useState("50");
  const [grantWebinars, setGrantWebinars] = useState("0");
  const [grantPrice, setGrantPrice] = useState("997");

  const loadLeads = useCallback(async () => {
    const response = await fetch("/api/superadmin/enterprise/leads?status=new", {
      cache: "no-store",
    });
    if (response.ok) setLeads((await response.json()).leads);
  }, []);

  const loadAccounts = useCallback(async () => {
    const response = await fetch("/api/superadmin/enterprise/accounts", { cache: "no-store" });
    if (response.ok) setAccounts((await response.json()).accounts);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLeads();
      void loadAccounts();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadLeads, loadAccounts]);

  async function markLead(leadId: string, status: string) {
    setBusy(leadId);
    await fetch("/api/superadmin/enterprise/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, status }),
    });
    setBusy(null);
    await loadLeads();
  }

  async function grant() {
    if (!grantTeamId.trim()) return;
    setBusy("grant");
    const response = await fetch("/api/superadmin/enterprise/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: grantTeamId.trim(),
        customMaxMembers: Number(grantMembers) || undefined,
        customMaxWebinars: Number(grantWebinars),
        customPriceMonthly: Number(grantPrice) || undefined,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      toast.error(payload.error ?? "Could not grant that.");
      return;
    }
    toast.success("Granted.");
    setGrantTeamId("");
    await loadAccounts();
  }

  if (!leads || !accounts) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-6 py-6 lg:px-8">
      <section>
        <h2 className="text-[13px] font-semibold text-white">New demo requests</h2>
        {leads.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-[#6E6E80]">Nothing waiting.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[13.5px] font-medium text-white">
                      {lead.company_name}
                    </p>
                    <p className="text-[11.5px] text-[#6E6E80]">
                      {lead.full_name} · {lead.work_email}
                      {lead.team_size && ` · ${lead.team_size} people`}
                      {lead.monthly_sessions && ` · ${lead.monthly_sessions} sessions/mo`}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => void markLead(lead.id, "contacted")}
                      disabled={busy === lead.id}
                      className="h-7 rounded-md border border-[#1E1E2E] px-2.5 text-[11.5px] text-[#A0A0B0] hover:text-white disabled:opacity-60"
                    >
                      Mark contacted
                    </button>
                    <button
                      onClick={() => void markLead(lead.id, "lost")}
                      disabled={busy === lead.id}
                      className="h-7 rounded-md px-2.5 text-[11.5px] text-[#6E6E80] hover:text-[#FF5A5A] disabled:opacity-60"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                {lead.message && (
                  <p className="mt-2 text-[12px] leading-relaxed text-[#C4C4D0]">
                    {lead.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <h2 className="text-[13px] font-semibold text-white">Grant enterprise status</h2>
        <p className="mt-1 text-[11.5px] text-[#6E6E80]">
          Applies custom limits directly to the team — every other part of the
          product reads the team&rsquo;s own limits, not this record.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <input
            value={grantTeamId}
            onChange={(event) => setGrantTeamId(event.target.value)}
            placeholder="Team ID"
            className="h-9 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12.5px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none sm:col-span-2"
          />
          <input
            type="number"
            value={grantMembers}
            onChange={(event) => setGrantMembers(event.target.value)}
            placeholder="Max members"
            className="h-9 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12.5px] text-white placeholder:text-[#4A4A5C] focus:outline-none"
          />
          <input
            type="number"
            value={grantWebinars}
            onChange={(event) => setGrantWebinars(event.target.value)}
            placeholder="Max webinars (0 = ∞)"
            className="h-9 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12.5px] text-white placeholder:text-[#4A4A5C] focus:outline-none"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            value={grantPrice}
            onChange={(event) => setGrantPrice(event.target.value)}
            placeholder="Monthly price"
            className="h-9 w-40 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12.5px] text-white placeholder:text-[#4A4A5C] focus:outline-none"
          />
          <button
            onClick={() => void grant()}
            disabled={busy === "grant" || !grantTeamId.trim()}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-[#6C47FF] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-60"
          >
            {busy === "grant" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Grant
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-semibold text-white">Enterprise accounts</h2>
        {accounts.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-[#6E6E80]">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#12121A] px-4 py-2.5"
              >
                <span className="text-[13px] text-white">
                  {account.team?.name ?? account.team_id}
                </span>
                <span className="text-[11.5px] text-[#6E6E80]">
                  {account.custom_max_members ?? "—"} members ·{" "}
                  {account.custom_max_webinars || "∞"} webinars ·{" "}
                  {account.custom_price_monthly
                    ? `$${account.custom_price_monthly}/mo`
                    : "no price set"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
