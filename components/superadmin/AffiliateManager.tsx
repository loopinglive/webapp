"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Loader2, Wallet } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

type Row = {
  id: string;
  userId: string;
  name: string;
  email: string;
  referralCode: string;
  commissionRate: number;
  totalReferrals: number;
  totalEarnings: number;
  paidEarnings: number;
  confirmedOwing: number;
  stillPending: number;
  payable: boolean;
  isActive: boolean;
  payoutMethod: string | null;
};

type Payload = {
  affiliates: Row[];
  threshold: number;
  totalOwing: number;
  payableCount: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

/**
 * The payout queue.
 *
 * Commission has been accruing on every purchase since Phase 7 with nothing
 * reading it back — this is the screen that makes it possible to actually pay
 * an affiliate.
 */
export function AffiliateManager() {
  const toast = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/superadmin/affiliates", { cache: "no-store" });
    if (response.ok) setData((await response.json()) as Payload);
    else setData({ affiliates: [], threshold: 50, totalOwing: 0, payableCount: 0 });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function act(affiliateId: string, action: string, label: string) {
    setBusy(affiliateId);
    const response = await fetch("/api/superadmin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affiliateId, action }),
    });
    const payload = (await response.json()) as {
      error?: string;
      amount?: number;
      referrals?: number;
    };
    setBusy(null);

    if (!response.ok) {
      toast.error(payload.error ?? "That did not work.");
      return;
    }

    toast.success(
      action === "mark_paid"
        ? `Marked ${money(payload.amount ?? 0)} paid across ${payload.referrals} referrals.`
        : label
    );
    await load();
  }

  if (!data) {
    return (
      <div className="px-6 py-6 lg:px-8">
        <SkeletonRows rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Affiliates" value={String(data.affiliates.length)} />
        <Tile
          label="Owed now"
          value={money(data.totalOwing)}
          hint="past the refund window"
          accent="#FFB020"
        />
        <Tile
          label="Ready to pay"
          value={String(data.payableCount)}
          hint={`over the ${money(data.threshold)} threshold`}
          accent={data.payableCount > 0 ? "#00C851" : undefined}
        />
        <Tile
          label="Paid to date"
          value={money(
            data.affiliates.reduce((sum, row) => sum + row.paidEarnings, 0)
          )}
        />
      </div>

      {data.affiliates.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="Nobody has joined the programme yet"
          description="Every account already has a referral code. An affiliate row appears here the moment someone enrols from their affiliate settings."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1E1E2E]">
          <table className="w-full min-w-[860px]">
            <thead className="bg-[#12121A]">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
                  Affiliate
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
                  Referrals
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
                  <span className="inline-flex items-center gap-1.5">
                    Owed
                    <HelpTooltip content="Commission whose 30-day refund window has passed. This is the amount that is safe to pay out." />
                  </span>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
                  <span className="inline-flex items-center gap-1.5">
                    Pending
                    <HelpTooltip content="Earned, but still inside the refund window. Becomes payable automatically once 30 days have passed." />
                  </span>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
                  Paid
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
                  Method
                </th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2E]">
              {data.affiliates.map((row) => (
                <tr key={row.id} className={row.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/superadmin/users/${row.userId}`}
                      className="text-[13px] text-white hover:text-[#6C47FF]"
                    >
                      {row.name}
                    </Link>
                    <p className="text-[11px] text-[#6E6E80]">
                      {row.email} · <code className="text-[#00D4FF]">{row.referralCode}</code> ·{" "}
                      {row.commissionRate}%
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[13px] tabular-nums text-[#A0A0B0]">
                    {row.totalReferrals}
                  </td>
                  <td
                    className="px-4 py-3 text-[13px] font-medium tabular-nums"
                    style={{ color: row.confirmedOwing > 0 ? "#FFB020" : "#6E6E80" }}
                  >
                    {money(row.confirmedOwing)}
                  </td>
                  <td className="px-4 py-3 text-[13px] tabular-nums text-[#6E6E80]">
                    {money(row.stillPending)}
                  </td>
                  <td className="px-4 py-3 text-[13px] tabular-nums text-[#A0A0B0]">
                    {money(row.paidEarnings)}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#6E6E80]">
                    {row.payoutMethod ?? "not set"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => act(row.id, "mark_paid", "Marked paid.")}
                        disabled={busy === row.id || row.confirmedOwing <= 0}
                        title={
                          row.confirmedOwing <= 0
                            ? "Nothing has cleared the refund window yet"
                            : row.payable
                              ? "Mark the owed balance as paid"
                              : `Below the ${money(data.threshold)} threshold, but payable`
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#1E1E2E] px-2.5 text-[12px] text-[#A0A0B0] hover:border-[#00C851]/50 hover:text-[#00C851] disabled:opacity-30"
                      >
                        {busy === row.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wallet className="h-3 w-3" />
                        )}
                        Mark paid
                      </button>
                      <button
                        onClick={() =>
                          act(
                            row.id,
                            row.isActive ? "deactivate" : "activate",
                            row.isActive ? "Deactivated." : "Activated."
                          )
                        }
                        disabled={busy === row.id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#1E1E2E] px-2.5 text-[12px] text-[#A0A0B0] hover:text-white disabled:opacity-40"
                      >
                        <BadgeCheck className="h-3 w-3" />
                        {row.isActive ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[12px] leading-relaxed text-[#6E6E80]">
        Marking paid settles every referral whose refund window has closed and adds the
        total to that affiliate&rsquo;s paid balance. It records the amount and the count
        in the audit log. It does <strong>not</strong> move money — pay them through
        whatever method they gave you, then mark it here.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
        {label}
      </p>
      <p
        className="mt-1.5 text-[22px] font-semibold tabular-nums tracking-[-0.02em]"
        style={{ color: accent ?? "#FFFFFF" }}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-[#6E6E80]">{hint}</p>}
    </div>
  );
}
