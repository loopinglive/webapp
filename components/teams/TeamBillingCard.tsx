"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { TEAM_PLANS } from "@/lib/teams/plans";
import type { Team } from "@/hooks/useTeam";

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "usd" }).format(
    cents / 100
  );

export function TeamBillingCard({
  team,
  usage,
}: {
  team: Team;
  usage: { members: number; webinars: number };
}) {
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  async function upgrade(planId: string) {
    setPending(planId);
    const response = await fetch(`/api/teams/${team.id}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    setPending(null);

    if (!response.ok || !payload.url) {
      toast.error(payload.error ?? "Could not start checkout.");
      return;
    }
    window.location.assign(payload.url);
  }

  async function manage() {
    setPending("portal");
    const response = await fetch(`/api/teams/${team.id}/checkout`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    setPending(null);

    if (!response.ok || !payload.url) {
      toast.error(payload.error ?? "Could not open the billing portal.");
      return;
    }
    window.location.assign(payload.url);
  }

  const currentPlan = TEAM_PLANS.find((plan) => plan.id === team.plan_slug);

  return (
    <div className="space-y-6 px-6 py-6 lg:px-10">
      <section className="rounded-2xl border border-hairline bg-surface p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Current plan
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
            {currentPlan?.name ?? team.plan_slug}
          </h2>
          {team.stripe_customer_id && (
            <button
              onClick={() => void manage()}
              disabled={pending === "portal"}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-surface-3 px-3.5 text-[12.5px] text-ink hover:border-accent/50 disabled:opacity-50"
            >
              {pending === "portal" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Manage subscription
            </button>
          )}
        </div>
        <p className="mt-3 text-[13px] text-ink-muted">
          {usage.members} / {team.max_members} members ·{" "}
          {usage.webinars} / {team.max_webinars || "∞"} webinars
        </p>
        {team.subscription_status === "past_due" && (
          <p className="mt-3 rounded-lg bg-[#FFB020]/10 px-3 py-2 text-[12.5px] text-[#FFB020]">
            The last payment failed. Update the card on file to avoid losing access.
          </p>
        )}
      </section>

      <section>
        <h3 className="text-[15px] font-semibold text-ink">Plans</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {TEAM_PLANS.map((plan) => {
            const isCurrent = plan.id === team.plan_slug;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-5 ${
                  isCurrent ? "border-accent bg-accent/[0.06]" : "border-hairline"
                }`}
              >
                <p className="text-[15px] font-semibold text-ink">{plan.name}</p>
                <p className="mt-1 text-[22px] font-semibold text-ink">
                  {money(plan.priceCents)}
                  <span className="text-[13px] font-normal text-ink-faint">/mo</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink-muted">
                  {plan.features.map((feature) => (
                    <li key={feature}>· {feature}</li>
                  ))}
                </ul>
                <button
                  onClick={() => void upgrade(plan.id)}
                  disabled={isCurrent || pending === plan.id}
                  className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent text-[13px] font-medium text-white hover:bg-accent-deep disabled:opacity-50"
                >
                  {pending === plan.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCurrent ? "Current plan" : "Choose this plan"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[12px] text-ink-faint">
          Need more than 15 members or unlimited seats?{" "}
          <a href="/enterprise" className="text-cyan hover:underline">
            Talk to us about Enterprise
          </a>
          .
        </p>
      </section>
    </div>
  );
}
