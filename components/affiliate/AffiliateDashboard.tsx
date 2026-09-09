"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { SITE } from "@/lib/constants";

type Referral = {
  id: string;
  date: string;
  email: string;
  plan: string;
  commission: number;
  status: string;
};

type Stats = {
  joined: boolean;
  referralCode: string;
  commissionRate?: number;
  totalReferrals?: number;
  totalEarnings?: number;
  pendingEarnings?: number;
  paidEarnings?: number;
  referrals: Referral[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export function AffiliateDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/affiliate/stats", { cache: "no-store" });
    if (response.ok) setStats((await response.json()) as Stats);
  }, []);

  useEffect(() => {
    // Deferred so the fetch's setState lands outside the effect body.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function join() {
    setJoining(true);
    await fetch("/api/affiliate/join", { method: "POST" });
    await load();
    setJoining(false);
  }

  if (!stats) {
    return (
      <div className="grid h-[50dvh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  const link = `${SITE.url}?ref=${stats.referralCode}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const share = encodeURIComponent(
    `I run my webinars on autopilot with Loopinglive — record once, sell forever. ${link}`
  );

  return (
    <div className="space-y-8 px-6 py-8 lg:px-10">
      <section className="rounded-2xl border border-hairline bg-gradient-to-br from-accent/10 to-transparent p-6">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
          Earn {stats.commissionRate ?? 20}% on every referral
        </h2>
        <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-muted">
          $9.40 per monthly signup, $69.40 per yearly, and $279.40 per lifetime — paid
          monthly once the 30-day refund window has passed.
        </p>

        {!stats.joined ? (
          <button
            onClick={join}
            disabled={joining}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-[14px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            {joining && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Join the affiliate programme
          </button>
        ) : (
          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Your referral link
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="flex-1 truncate rounded-full border border-hairline bg-void px-4 py-2.5 text-[13px] text-cyan">
                {link}
              </code>
              <button
                onClick={copy}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-surface-3 px-4 text-[13px] text-ink transition-colors hover:border-accent/50"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[#00C851]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "X", href: `https://twitter.com/intent/tweet?text=${share}` },
                { label: "WhatsApp", href: `https://wa.me/?text=${share}` },
                {
                  label: "LinkedIn",
                  href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
                },
              ].map((target) => (
                <a
                  key={target.label}
                  href={target.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-hairline px-3.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:border-accent/50 hover:text-ink"
                >
                  Share on {target.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {stats.joined && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total referrals", value: String(stats.totalReferrals ?? 0) },
              { label: "Total earned", value: money(stats.totalEarnings ?? 0) },
              {
                label: "Pending",
                value: money(stats.pendingEarnings ?? 0),
                hint: "Awaiting the 30-day refund window",
              },
              { label: "Paid out", value: money(stats.paidEarnings ?? 0) },
            ].map((tile) => (
              <div
                key={tile.label}
                className="rounded-xl border border-hairline bg-surface px-4 py-3.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  {tile.label}
                </p>
                <p className="mt-1.5 text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-ink">
                  {tile.value}
                </p>
                {tile.hint && (
                  <p className="mt-1 text-[11px] text-ink-faint">{tile.hint}</p>
                )}
              </div>
            ))}
          </div>

          <section>
            <h3 className="text-[15px] font-semibold text-ink">Your referrals</h3>
            {stats.referrals.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink-faint">
                No referrals yet. Anyone who signs up through your link and upgrades
                appears here.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-hairline">
                <table className="w-full min-w-[560px]">
                  <thead className="bg-surface">
                    <tr>
                      {["Date", "Referred", "Plan", "Commission", "Status"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {stats.referrals.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-[12.5px] text-ink-muted">
                          {new Date(row.date).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-ink">{row.email}</td>
                        <td className="px-4 py-3 text-[12.5px] capitalize text-ink-muted">
                          {row.plan}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] tabular-nums text-ink">
                          {money(row.commission)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] capitalize"
                            style={{
                              color:
                                row.status === "paid"
                                  ? "#00C851"
                                  : row.status === "confirmed"
                                    ? "#00D4FF"
                                    : "#FFB020",
                              background: "rgba(255,255,255,.04)",
                            }}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-[12.5px] text-ink-faint">
            Payouts run monthly on confirmed balances above $50.
          </p>
        </>
      )}
    </div>
  );
}
