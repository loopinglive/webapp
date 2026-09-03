import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { data } = await createServiceClient()
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ coupons: data ?? [] });
}

export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const body = (await request.json()) as {
    code?: string;
    discountType?: "percent" | "amount";
    discountValue?: number;
    appliesTo?: string[];
    maxUses?: number | null;
    expiresAt?: string | null;
  };

  const code = (body.code ?? "").trim().toUpperCase();
  const discountValue = Number(body.discountValue ?? 0);
  const discountType = body.discountType === "amount" ? "amount" : "percent";

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return NextResponse.json(
      { error: "Codes are 3-32 characters: letters, numbers, dashes." },
      { status: 400 }
    );
  }
  if (discountValue <= 0 || (discountType === "percent" && discountValue > 100)) {
    return NextResponse.json({ error: "Enter a valid discount." }, { status: 400 });
  }

  // Create in Stripe first — a coupon we cannot actually apply at checkout is
  // worse than no coupon, because it fails in front of a paying customer.
  let stripeCouponId: string | null = null;
  if (billingConfigured()) {
    try {
      const coupon = await stripe().coupons.create({
        name: code,
        ...(discountType === "percent"
          ? { percent_off: discountValue }
          : { amount_off: Math.round(discountValue * 100), currency: "usd" }),
        ...(body.maxUses ? { max_redemptions: body.maxUses } : {}),
        ...(body.expiresAt
          ? { redeem_by: Math.floor(new Date(body.expiresAt).getTime() / 1000) }
          : {}),
      });
      stripeCouponId = coupon.id;
    } catch (error) {
      return NextResponse.json(
        { error: `Stripe rejected the coupon: ${(error as Error).message}` },
        { status: 502 }
      );
    }
  }

  const { data, error } = await createServiceClient()
    .from("coupons")
    .insert({
      code,
      stripe_coupon_id: stripeCouponId,
      discount_type: discountType,
      discount_value: discountValue,
      applies_to: body.appliesTo ?? [],
      max_uses: body.maxUses ?? null,
      expires_at: body.expiresAt ?? null,
      created_by: admin.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ coupon: data });
}

export async function PATCH(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { id, isActive } = (await request.json()) as {
    id?: string;
    isActive?: boolean;
  };
  if (!id) return NextResponse.json({ error: "A coupon is required." }, { status: 400 });

  const supabase = createServiceClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("stripe_coupon_id")
    .eq("id", id)
    .maybeSingle();

  if (!isActive && coupon?.stripe_coupon_id && billingConfigured()) {
    try {
      await stripe().coupons.del(coupon.stripe_coupon_id);
    } catch {
      // Already gone in Stripe is fine; the local flag is what gates checkout.
    }
  }

  await supabase.from("coupons").update({ is_active: Boolean(isActive) }).eq("id", id);
  return NextResponse.json({ success: true });
}
