import { NextResponse } from "next/server";

import { clientIp, LIMITS, rateLimit } from "@/lib/ratelimit";

import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { sendEmail } from "@/lib/messaging/providers";
import { SITE } from "@/lib/constants";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { data: signUp, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (signUpError || !signUp.user) {
    return NextResponse.json(
      { error: signUpError?.message ?? "Could not create the account." },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const userId = signUp.user.id;

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

  // Welcome email. A failure here must not fail the signup.
  try {
    const { subject, html, text } = renderPlatformEmail(
      "host_welcome",
      { host_name: fullName.split(" ")[0], dashboard_url: `${SITE.url}/dashboard` },
      { brandName: "Loopinglive" }
    );
    await sendEmail({
      to: email,
      fromName: "Loopinglive",
      fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
      subject,
      html,
      text,
    });
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ success: true, userId });
}
