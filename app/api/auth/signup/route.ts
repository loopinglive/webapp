import { NextResponse } from "next/server";

import { sendSignupConfirmation } from "@/lib/auth/auth-emails";
import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { clientIp, LIMITS, rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const limit = rateLimit(`signup:${clientIp(request)}`, LIMITS.signup);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many sign-up attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const body = (await request.json()) as {
    fullName?: string;
    email?: string;
    password?: string;
    referralCode?: string;
  };

  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!fullName) {
    return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  // generateLink creates the account and returns a token WITHOUT Supabase
  // sending anything, so the only confirmation email is ours, from our
  // verified domain, in our own template.
  const created = await sendSignupConfirmation({ email, password, fullName });

  if (!created.ok || !created.userId) {
    return NextResponse.json(
      { error: created.error ?? "Could not create the account." },
      { status: 400 }
    );
  }

  const userId = created.userId;

  const service = createServiceClient();

  // A Stripe customer is created for free users too, so upgrading later is a
  // single checkout rather than a customer-creation dance mid-payment.
  let stripeCustomerId: string | null = null;
  if (billingConfigured()) {
    try {
      const customer = await stripe().customers.create({
        email,
        name: fullName,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
    } catch {
      // Never block signup on Stripe. The customer is created lazily at
      // checkout if this failed.
    }
  }

  // Resolve the referrer before writing, so a bad code simply does not attach.
  let referredBy: string | null = null;
  const referralCode = (body.referralCode ?? "").trim();
  if (referralCode) {
    const { data: referrer } = await service
      .from("user_accounts")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();
    // Self-referral is impossible here anyway (the account is new), but the
    // check documents the rule.
    if (referrer && referrer.id !== userId) referredBy = referrer.id;
  }

  // The auth trigger has already inserted a bare row, so this updates it.
  await service
    .from("user_accounts")
    .update({
      full_name: fullName,
      email,
      stripe_customer_id: stripeCustomerId,
      referred_by: referredBy,
      plan_slug: "free",
      plan_started_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return NextResponse.json({
    success: true,
    userId,
    requiresConfirmation: true,
    emailSent: created.emailSent,
  });
}
