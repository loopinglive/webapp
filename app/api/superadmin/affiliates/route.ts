import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Confirmed balance needed before a payout can be requested. */
const PAYOUT_THRESHOLD = 50;

/**
 * Affiliate management and the payout queue.
 *
 * Until now commission accrued on every purchase and nothing read it back —
 * there was no way to see who was owed money, let alone pay them.
 */
export async function GET() {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createServiceClient();

  const { data: affiliates } = await supabase
    .from("affiliates")
    .select("*")
    .order("total_earnings", { ascending: false });

  const ids = (affiliates ?? []).map((a) => a.user_id);
  const affiliateIds = (affiliates ?? []).map((a) => a.id);

  const [{ data: owners }, { data: referrals }] = await Promise.all([
    ids.length
      ? supabase.from("user_accounts").select("id, full_name, email").in("id", ids)
      : Promise.resolve({ data: [] }),
    affiliateIds.length
      ? supabase
          .from("affiliate_referrals")
          .select("id, affiliate_id, commission_amount, status, confirms_at, paid_at, created_at, referred_user_id")
          .in("affiliate_id", affiliateIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
  ]);

  const byId = new Map((owners ?? []).map((o) => [o.id, o]));
  const now = Date.now();

  const rows = (affiliates ?? []).map((affiliate) => {
    const mine = (referrals ?? []).filter((r) => r.affiliate_id === affiliate.id);

    // Pending commission whose refund window has now elapsed is payable, even
    // if nothing has flipped its status yet.
    const confirmed = mine
      .filter(
        (r) =>
          r.status === "confirmed" ||
          (r.status === "pending" &&
            r.confirms_at !== null &&
            new Date(r.confirms_at).getTime() <= now)
      )
      .reduce((sum, r) => sum + Number(r.commission_amount ?? 0), 0);

    const stillPending = mine
      .filter(
        (r) =>
          r.status === "pending" &&
          (r.confirms_at === null || new Date(r.confirms_at).getTime() > now)
      )
      .reduce((sum, r) => sum + Number(r.commission_amount ?? 0), 0);

    const owner = byId.get(affiliate.user_id);

    return {
      id: affiliate.id,
      userId: affiliate.user_id,
      name: owner?.full_name ?? "—",
      email: owner?.email ?? "—",
      referralCode: affiliate.referral_code,
      commissionRate: Number(affiliate.commission_rate),
      totalReferrals: affiliate.total_referrals,
      totalEarnings: Number(affiliate.total_earnings),
      paidEarnings: Number(affiliate.paid_earnings),
      confirmedOwing: +confirmed.toFixed(2),
      stillPending: +stillPending.toFixed(2),
      payable: confirmed >= PAYOUT_THRESHOLD,
      isActive: affiliate.is_active,
      payoutMethod: affiliate.payout_method,
    };
  });

  return NextResponse.json({
    affiliates: rows,
    threshold: PAYOUT_THRESHOLD,
    totalOwing: +rows.reduce((sum, r) => sum + r.confirmedOwing, 0).toFixed(2),
    payableCount: rows.filter((r) => r.payable).length,
  });
}

const schema = z.object({
  affiliateId: z.string().uuid(),
  action: z.enum(["mark_paid", "deactivate", "activate"]),
});

export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { affiliateId, action } = parsed.data;

  if (action !== "mark_paid") {
    await supabase
      .from("affiliates")
      .update({ is_active: action === "activate" })
      .eq("id", affiliateId);

    await supabase.from("admin_actions").insert({
      admin_id: admin.id,
      action: `affiliate_${action}`,
      detail: { affiliateId } as never,
    });

    return NextResponse.json({ success: true });
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, user_id, paid_earnings")
    .eq("id", affiliateId)
    .maybeSingle();

  if (!affiliate) {
    return NextResponse.json({ error: "No such affiliate." }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Everything past its refund window becomes paid together, so the balance
  // shown is the balance settled.
  const { data: due } = await supabase
    .from("affiliate_referrals")
    .select("id, commission_amount")
    .eq("affiliate_id", affiliateId)
    .is("paid_at", null)
    .lte("confirms_at", now);

  const amount = (due ?? []).reduce(
    (sum, row) => sum + Number(row.commission_amount ?? 0),
    0
  );

  if (!due?.length) {
    return NextResponse.json(
      { error: "Nothing is currently payable for this affiliate." },
      { status: 400 }
    );
  }

  await supabase
    .from("affiliate_referrals")
    .update({ status: "paid", paid_at: now })
    .in(
      "id",
      due.map((row) => row.id)
    );

  await supabase
    .from("affiliates")
    .update({
      paid_earnings: Number(affiliate.paid_earnings ?? 0) + amount,
      pending_earnings: 0,
    })
    .eq("id", affiliateId);

  await supabase.from("admin_actions").insert({
    admin_id: admin.id,
    target_user_id: affiliate.user_id,
    action: "affiliate_paid",
    detail: { affiliateId, amount, referrals: due.length } as never,
  });

  return NextResponse.json({ success: true, amount, referrals: due.length });
}
