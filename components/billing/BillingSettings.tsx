"use client";

import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";

import { PricingCard } from "@/components/billing/PricingCard";
import { useBilling } from "@/hooks/useBilling";
import { PLANS, type PlanSlug } from "@/lib/billing/plans";

type Invoice = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  plan_slug: string;
  paid_at: string | null;
  created_at: string;
  invoice_pdf_url: string | null;
};

export function BillingSettings({
  planSlug,
  planName,
  planExpiresAt,
  subscriptionStatus,
  invoices,
}: {
  planSlug: PlanSlug;
  planName: string;
  planExpiresAt: string | null;
  subscriptionStatus: string | null;
  invoices: Invoice[];
}) {
  const { startCheckout, openPortal, pending, error } = useBilling();
  const [coupon, setCoupon] = useState("");

  const isFree = planSlug === "free";
  const isLifetime = planSlug === "lifetime";

  return (
    <div className="space-y-8 px-6 py-8 lg:px-10">
      {/* Current plan */}
      <section className="rounded-2xl border border-hairline bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Current plan
            </p>
            <h2 className="mt-1.5 text-[24px] font-semibold tracking-[-0.02em] text-ink">
              {planName}
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              {isLifetime
                ? "Yours forever — no renewal, no expiry."
                : isFree
                  ? "You can build everything. Upgrade when you are ready to go live."
                  : planExpiresAt
                    ? `Renews ${new Date(planExpiresAt).toLocaleDateString(undefined, { dateStyle: "long" })}`
                    : "Active"}
            </p>

            {subscriptionStatus === "past_due" && (
              <p className="mt-3 rounded-lg bg-[#FFB020]/10 px-3 py-2 text-[12.5px] text-[#FFB020]">
                Your last payment failed. Update your card to avoid losing access.
              </p>
            )}
          </div>

          {!isFree && (
            <button
              onClick={openPortal}
              disabled={pending === "portal"}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-surface-3 px-4 text-[13px] text-ink transition-colors hover:border-accent/50 disabled:opacity-50"
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
      </section>

      {/* Upgrade options */}
      {isFree && (
        <section>
          <h3 className="text-[15px] font-semibold text-ink">Choose a plan</h3>
          <p className="mt-1 text-[13px] text-ink-muted">
            Everything you have already built carries over.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {PLANS.filter((plan) => plan.slug !== "free").map((plan) => (
              <PricingCard
                key={plan.slug}
                plan={plan}
                currentPlan={planSlug}
                pending={pending === plan.slug}
                onSelect={(slug) => startCheckout(slug, coupon || undefined)}
              />
            ))}
          </div>

          <div className="mt-5 flex max-w-[340px] items-center gap-2">
            <input
              value={coupon}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              placeholder="Coupon code (optional)"
              className="h-10 flex-1 rounded-full border border-hairline bg-surface px-4 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </div>
        </section>
      )}

      {error && <p className="text-[13px] text-[#FF6B6B]">{error}</p>}

      {/* Invoices */}
      <section>
        <h3 className="text-[15px] font-semibold text-ink">Invoice history</h3>

        {invoices.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-faint">
            No payments yet. Invoices appear here as soon as you upgrade.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-hairline">
            <table className="w-full min-w-[560px]">
              <thead className="bg-surface">
                <tr>
                  {["Date", "Plan", "Amount", "Status", ""].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 text-[12.5px] text-ink-muted">
                      {new Date(invoice.paid_at ?? invoice.created_at).toLocaleDateString(
                        undefined,
                        { dateStyle: "medium" }
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] capitalize text-ink">
                      {invoice.plan_slug}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-ink">
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: invoice.currency?.toUpperCase() || "USD",
                      }).format(Number(invoice.amount))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] capitalize"
                        style={{
                          color: invoice.status === "paid" ? "#00C851" : "#FFB020",
                          background:
                            invoice.status === "paid"
                              ? "rgba(0,200,81,.12)"
                              : "rgba(255,176,32,.12)",
                        }}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {invoice.invoice_pdf_url && (
                        <a
                          href={invoice.invoice_pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:text-[#8A6BFF]"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[12.5px] text-ink-faint">
        Not satisfied? Contact us within 30 days for a full refund — no questions asked.
      </p>
    </div>
  );
}
