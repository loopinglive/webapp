import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Masks referred emails — an affiliate does not need the full address. */
function maskEmail(email: string | null) {
  if (!email) return "—";
  const [name, domain] = email.split("@");
  if (!domain) return "—";
  const head = name.slice(0, 2);
  return `${head}${"•".repeat(Math.max(3, name.length - 2))}@${domain}`;
}

export async function GET() {
  const account = await getUserAccount();
  if (!account) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", account.id)
    .maybeSingle();

  if (!affiliate) {
    return NextResponse.json({
      joined: false,
      referralCode: account.referral_code,
      referrals: [],
    });
  }

  const { data: rows } = await supabase
    .from("affiliate_referrals")
    .select("id, commission_amount, status, created_at, referred_user_id")
    .eq("affiliate_id", affiliate.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const ids = (rows ?? []).map((r) => r.referred_user_id).filter(Boolean) as string[];
  const { data: users } = ids.length
    ? await supabase.from("user_accounts").select("id, email, plan_slug").in("id", ids)
    : { data: [] };

  const byId = new Map((users ?? []).map((u) => [u.id, u]));

  // Clicks are not tracked yet, so a conversion rate would be invented.
  return NextResponse.json({
    joined: true,
    referralCode: affiliate.referral_code,
    commissionRate: Number(affiliate.commission_rate),
    totalReferrals: affiliate.total_referrals,
    totalEarnings: Number(affiliate.total_earnings),
    pendingEarnings: Number(affiliate.pending_earnings),
    paidEarnings: Number(affiliate.paid_earnings),
    referrals: (rows ?? []).map((row) => ({
      id: row.id,
      date: row.created_at,
      email: maskEmail(byId.get(row.referred_user_id ?? "")?.email ?? null),
      plan: byId.get(row.referred_user_id ?? "")?.plan_slug ?? "—",
      commission: Number(row.commission_amount ?? 0),
      status: row.status,
    })),
  });
}
