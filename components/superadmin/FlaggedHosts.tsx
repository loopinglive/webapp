"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertOctagon, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type Signals = {
  sales: number;
  disputes: number;
  open_disputes: number;
  dispute_rate: number;
  disputed_amount_cents: number;
};

type Host = {
  owner_id: string;
  email: string;
  full_name: string | null;
  plan_slug: string;
  signals: Signals;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

/**
 * Hosts whose chargebacks cross a line worth a look.
 *
 * The line is the one payment processors themselves use before restricting an
 * account — dispute rate above 1%, or two disputes open at once, which a
 * single unhappy customer does not produce on its own.
 *
 * Empty is the state you want this in. It stays quiet rather than listing
 * every host with a single old dispute, which would be true and useless.
 */
export function FlaggedHosts() {
  const [hosts, setHosts] = useState<Host[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/superadmin/fraud-signals", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { hosts: Host[] };
    setHosts(payload.hosts);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (!hosts) {
    return (
      <div className="grid h-24 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (hosts.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="Nothing flagged"
        description="No host's dispute rate or open-dispute count crosses the line right now."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {hosts.map((host) => (
        <li
          key={host.owner_id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FF5A5A]/30 bg-[#FF5A5A]/[0.06] px-4 py-3"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] font-medium text-white">
              <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-[#FF5A5A]" />
              <Link
                href={`/superadmin/users/${host.owner_id}`}
                className="hover:underline"
              >
                {host.full_name || host.email}
              </Link>
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#A0A0B0]">
              {host.email} · {host.plan_slug}
            </p>
          </div>

          <div className="text-right text-[11.5px] text-[#6E6E80]">
            <p>
              <span className="text-white">{host.signals.disputes}</span>{" "}
              {host.signals.disputes === 1 ? "dispute" : "disputes"}
              {host.signals.open_disputes > 0 && (
                <span className="text-[#FF5A5A]">
                  {" "}
                  ({host.signals.open_disputes} open)
                </span>
              )}
              {" · "}
              {(host.signals.dispute_rate * 100).toFixed(1)}% of{" "}
              {host.signals.sales} sales
            </p>
            <p>{money(host.signals.disputed_amount_cents)} disputed</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
