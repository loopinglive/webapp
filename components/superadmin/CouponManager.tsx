"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Shuffle } from "lucide-react";

import { PLANS } from "@/lib/billing/plans";

type Coupon = {
  id: string;
  code: string;
  stripe_coupon_id: string | null;
  discount_type: string;
  discount_value: number;
  applies_to: string[];
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
};

const PAID = PLANS.filter((plan) => plan.slug !== "free");

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("20");
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/superadmin/coupons", { cache: "no-store" });
    if (response.ok) {
      const { coupons } = (await response.json()) as { coupons: Coupon[] };
      setCoupons(coupons);
    }
  }, []);

  useEffect(() => {
    // Deferred so the fetch's setState lands outside the effect body.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function create() {
    setBusy(true);
    setError(null);

    const response = await fetch("/api/superadmin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        discountType,
        discountValue: Number(discountValue),
        appliesTo,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt || null,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not create the coupon.");
      return;
    }

    setCode("");
    setMaxUses("");
    setExpiresAt("");
    await load();
  }

  async function toggle(coupon: Coupon) {
    await fetch("/api/superadmin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: coupon.id, isActive: !coupon.is_active }),
    });
    await load();
  }

  return (
    <div className="space-y-8 px-6 py-6 lg:px-8">
      <section className="max-w-[620px] rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-6">
        <h2 className="text-[15px] font-semibold text-white">Create a coupon</h2>

        <div className="mt-4 space-y-3.5">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="LAUNCH20"
              className="h-10 flex-1 rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
            />
            <button
              onClick={() =>
                setCode(
                  Array.from({ length: 8 }, () =>
                    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(
                      Math.floor(Math.random() * 32)
                    )
                  ).join("")
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#1E1E2E] px-3.5 text-[12.5px] text-[#A0A0B0] hover:text-white"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Generate
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={discountType}
              onChange={(event) =>
                setDiscountType(event.target.value as "percent" | "amount")
              }
              className="h-10 rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white focus:outline-none"
            >
              <option value="percent">Percentage off</option>
              <option value="amount">Fixed amount off</option>
            </select>
            <input
              type="number"
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
              className="h-10 w-[110px] rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white focus:border-[#6C47FF] focus:outline-none"
            />
            <span className="self-center text-[13px] text-[#6E6E80]">
              {discountType === "percent" ? "%" : "USD"}
            </span>
          </div>

          <div>
            <p className="mb-2 text-[12px] text-[#A0A0B0]">
              Applies to (none selected means every paid plan)
            </p>
            <div className="flex flex-wrap gap-2">
              {PAID.map((plan) => (
                <label
                  key={plan.slug}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-[#1E1E2E] px-3 py-1.5 text-[12.5px] text-[#A0A0B0]"
                >
                  <input
                    type="checkbox"
                    checked={appliesTo.includes(plan.slug)}
                    onChange={(event) =>
                      setAppliesTo((current) =>
                        event.target.checked
                          ? [...current, plan.slug]
                          : current.filter((slug) => slug !== plan.slug)
                      )
                    }
                    className="h-3.5 w-3.5 accent-[#6C47FF]"
                  />
                  {plan.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              placeholder="Max uses (blank = unlimited)"
              className="h-10 flex-1 rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
            />
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="h-10 rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white focus:border-[#6C47FF] focus:outline-none"
            />
          </div>

          {error && <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>}

          <button
            onClick={create}
            disabled={busy || !code}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#6C47FF] px-5 text-[13px] font-semibold text-white hover:bg-[#7C5AFF] disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create coupon
          </button>

          <p className="text-[11.5px] text-[#6E6E80]">
            The coupon is created in Stripe first — one that cannot be applied at
            checkout would fail in front of a paying customer.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold text-white">All coupons</h2>
        {coupons.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#6E6E80]">No coupons yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#1E1E2E]">
            <table className="w-full min-w-[720px]">
              <thead className="bg-[#12121A]">
                <tr>
                  {["Code", "Discount", "Applies to", "Uses", "Expires", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E2E]">
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-[#00D4FF]">
                      {coupon.code}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-white">
                      {coupon.discount_type === "percent"
                        ? `${coupon.discount_value}%`
                        : `$${coupon.discount_value}`}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] capitalize text-[#A0A0B0]">
                      {(coupon.applies_to ?? []).length
                        ? (coupon.applies_to ?? []).join(", ")
                        : "all paid"}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {coupon.uses_count}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-[#A0A0B0]">
                      {coupon.expires_at
                        ? new Date(coupon.expires_at).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          color: coupon.is_active ? "#00C851" : "#6E6E80",
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        {coupon.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggle(coupon)}
                        className="text-[12px] text-[#A0A0B0] hover:text-white"
                      >
                        {coupon.is_active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
