import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Checks a coupon before checkout, so the price shown is the price charged. */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { code, planSlug } = (await request.json()) as {
    code?: string;
    planSlug?: string;
  };

  const normalised = (code ?? "").trim().toUpperCase();
  if (!normalised) {
    return NextResponse.json({ error: "Enter a coupon code." }, { status: 400 });
  }

  const { data: coupon } = await createServiceClient()
    .from("coupons")
    .select("code, discount_type, discount_value, applies_to, max_uses, uses_count, expires_at, is_active")
    .eq("code", normalised)
    .maybeSingle();

  const appliesTo = (coupon?.applies_to as string[] | null) ?? [];

  const valid =
    coupon &&
    coupon.is_active &&
    (appliesTo.length === 0 || (planSlug ? appliesTo.includes(planSlug) : true)) &&
    (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
    (coupon.max_uses === null || (coupon.uses_count ?? 0) < coupon.max_uses);

  if (!valid) {
    return NextResponse.json(
      { valid: false, error: "That code is not valid for this plan." },
      { status: 200 }
    );
  }

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),
  });
}
