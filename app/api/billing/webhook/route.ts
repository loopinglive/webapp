import type Stripe from "stripe";

import { PLAN_BY_SLUG, type PlanSlug } from "@/lib/billing/plans";
import { stripe, webhooksConfigured } from "@/lib/billing/stripe";
import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { sendEmail } from "@/lib/messaging/providers";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Client = ReturnType<typeof createServiceClient>;

/** Thirty days, matching the refund window before commission is confirmed. */
const REFUND_WINDOW_DAYS = 30;

const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);

async function notify(
  key: string,
  email: string,
  variables: Record<string, string>
) {
  try {
    const { subject, html, text } = renderPlatformEmail(key, variables, {
      brandName: "Loopinglive",
    });
    await sendEmail({
      to: email,
      fromName: "Loopinglive",
      fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
      subject,
      html,
      text,
    });
  } catch {
    // A failed notification must never fail the webhook — Stripe would retry
    // the whole event and the plan change would be applied twice.
  }
}

/** Expiry for a newly started period. Lifetime never expires. */
function expiryFor(slug: PlanSlug): string | null {
  const now = new Date();
  if (slug === "monthly") {
    now.setMonth(now.getMonth() + 1);
    return now.toISOString();
  }
  if (slug === "yearly") {
    now.setFullYear(now.getFullYear() + 1);
    return now.toISOString();
  }
  return null;
}

/** Credits the referrer, if the buyer was referred and is not themselves. */
async function recordCommission(
  supabase: Client,
  userId: string,
  invoiceId: string | null,
  amountCents: number
) {
  const { data: buyer } = await supabase
    .from("user_accounts")
    .select("referred_by")
    .eq("id", userId)
    .maybeSingle();

  if (!buyer?.referred_by || buyer.referred_by === userId) return;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, commission_rate, total_referrals, total_earnings, pending_earnings")
    .eq("user_id", buyer.referred_by)
    .eq("is_active", true)
    .maybeSingle();

  if (!affiliate) return;

  const rate = Number(affiliate.commission_rate ?? 20);
  const commission = +((amountCents / 100) * (rate / 100)).toFixed(2);

  const confirms = new Date();
  confirms.setDate(confirms.getDate() + REFUND_WINDOW_DAYS);

  await supabase.from("affiliate_referrals").insert({
    affiliate_id: affiliate.id,
    referred_user_id: userId,
    invoice_id: invoiceId,
    commission_amount: commission,
    status: "pending",
    confirms_at: confirms.toISOString(),
  });

  await supabase
    .from("affiliates")
    .update({
      total_referrals: (affiliate.total_referrals ?? 0) + 1,
      total_earnings: Number(affiliate.total_earnings ?? 0) + commission,
      pending_earnings: Number(affiliate.pending_earnings ?? 0) + commission,
    })
    .eq("id", affiliate.id);
}

export async function POST(request: Request) {
  if (!webhooksConfigured()) {
    return Response.json({ error: "Webhooks not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  // The raw body is required for signature verification — parsing it first
  // would change the bytes and every event would be rejected.
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      raw,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      // Two kinds of checkout land here: a host buying a plan, and an attendee
      // buying a host's offer from inside the webinar. They are told apart by
      // the metadata rather than by guessing from the amount.
      if (session.metadata?.kind === "webinar_offer") {
        await recordOfferPurchase(supabase, session);
        break;
      }

      const userId = session.metadata?.userId;
      const planSlug = session.metadata?.planSlug as PlanSlug | undefined;
      if (!userId || !planSlug) break;

      const amountCents = session.amount_total ?? 0;
      const currency = session.currency ?? "usd";

      await supabase
        .from("user_accounts")
        .update({
          plan_slug: planSlug,
          subscription_status: "active",
          plan_started_at: new Date().toISOString(),
          plan_expires_at: expiryFor(planSlug),
          stripe_subscription_id:
            typeof session.subscription === "string" ? session.subscription : null,
        })
        .eq("id", userId);

      const { data: invoice } = await supabase
        .from("invoices")
        .insert({
          user_id: userId,
          stripe_invoice_id:
            typeof session.invoice === "string" ? session.invoice : session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          amount: amountCents / 100,
          currency,
          status: "paid",
          plan_slug: planSlug,
          billing_period: PLAN_BY_SLUG.get(planSlug)?.billingPeriod ?? planSlug,
          paid_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      await recordCommission(supabase, userId, invoice?.id ?? null, amountCents);

      // Redeeming a coupon is counted only once the payment actually lands.
      const code = session.metadata?.couponCode;
      if (code) {
        const { data: coupon } = await supabase
          .from("coupons")
          .select("id, uses_count")
          .eq("code", code)
          .maybeSingle();
        if (coupon) {
          await supabase
            .from("coupons")
            .update({ uses_count: (coupon.uses_count ?? 0) + 1 })
            .eq("id", coupon.id);
        }
      }

      const { data: account } = await supabase
        .from("user_accounts")
        .select("email, full_name")
        .eq("id", userId)
        .maybeSingle();

      if (account?.email) {
        const plan = PLAN_BY_SLUG.get(planSlug);
        await notify("host_payment_receipt", account.email, {
          host_name: (account.full_name || "there").split(" ")[0],
          amount: money(amountCents, currency),
          plan_name: plan?.name ?? planSlug,
          period_start: new Date().toLocaleDateString("en-GB", { dateStyle: "long" }),
          period_end:
            expiryFor(planSlug)
              ? new Date(expiryFor(planSlug)!).toLocaleDateString("en-GB", {
                  dateStyle: "long",
                })
              : "never — lifetime access",
          next_payment_date:
            planSlug === "lifetime"
              ? "never"
              : new Date(expiryFor(planSlug)!).toLocaleDateString("en-GB", {
                  dateStyle: "long",
                }),
          invoice_number: invoice?.id?.slice(0, 8).toUpperCase() ?? "—",
          invoice_url: `${SITE.url}/settings/billing`,
        });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      if (!customerId) break;

      const { data: account } = await supabase
        .from("user_accounts")
        .select("id, plan_slug")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (!account) break;

      const slug = account.plan_slug as PlanSlug;

      await supabase
        .from("user_accounts")
        .update({
          subscription_status: "active",
          plan_expires_at: expiryFor(slug),
        })
        .eq("id", account.id);

      // Renewals arrive here too; the checkout event already wrote the first
      // invoice, so this upserts on the Stripe id rather than duplicating.
      await supabase.from("invoices").upsert(
        {
          user_id: account.id,
          stripe_invoice_id: invoice.id,
          amount: (invoice.amount_paid ?? 0) / 100,
          currency: invoice.currency ?? "usd",
          status: "paid",
          plan_slug: slug,
          billing_period: PLAN_BY_SLUG.get(slug)?.billingPeriod ?? slug,
          invoice_url: invoice.hosted_invoice_url ?? null,
          invoice_pdf_url: invoice.invoice_pdf ?? null,
          paid_at: new Date().toISOString(),
        },
        { onConflict: "stripe_invoice_id", ignoreDuplicates: false }
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      if (!customerId) break;

      const { data: account } = await supabase
        .from("user_accounts")
        .select("id, email, full_name")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (!account) break;

      // Access is not revoked here. past_due is a grace state; the
      // subscription.deleted event is what actually downgrades.
      await supabase
        .from("user_accounts")
        .update({ subscription_status: "past_due" })
        .eq("id", account.id);

      if (account.email) {
        const retry = new Date();
        retry.setDate(retry.getDate() + 3);
        await notify("host_payment_failed", account.email, {
          host_name: (account.full_name || "there").split(" ")[0],
          amount: money(invoice.amount_due ?? 0, invoice.currency ?? "usd"),
          failure_reason: "The payment was declined",
          retry_date: retry.toLocaleDateString("en-GB", { dateStyle: "long" }),
          billing_url: `${SITE.url}/settings/billing`,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : null;
      if (!customerId) break;

      const { data: account } = await supabase
        .from("user_accounts")
        .select("id, email, full_name, plan_slug")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (!account) break;

      // A lifetime purchase is not a subscription, so it can never be
      // cancelled by this event. Guard against a stray one anyway.
      if (account.plan_slug === "lifetime") break;

      await supabase
        .from("user_accounts")
        .update({
          plan_slug: "free",
          subscription_status: "cancelled",
          plan_expires_at: new Date().toISOString(),
          stripe_subscription_id: null,
        })
        .eq("id", account.id);

      if (account.email) {
        await notify("host_subscription_cancelled", account.email, {
          host_name: (account.full_name || "there").split(" ")[0],
          plan_name: account.plan_slug ?? "your plan",
          access_until: new Date().toLocaleDateString("en-GB", { dateStyle: "long" }),
          billing_url: `${SITE.url}/settings/billing`,
          support_email: "support@loopinglive.com",
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : null;
      const planSlug = subscription.metadata?.planSlug as PlanSlug | undefined;
      if (!customerId) break;

      await supabase
        .from("user_accounts")
        .update({
          ...(planSlug ? { plan_slug: planSlug } : {}),
          stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
          subscription_status:
            subscription.status === "active" ? "active" : subscription.status,
        })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return Response.json({ received: true });
}

/**
 * An attendee bought the host's offer from inside the room.
 *
 * Writes the purchase ledger row and flips the registrant, which is what the
 * follow-up engine and the analytics both read. Idempotent on the Stripe
 * session id: a webhook retry must not double-count revenue.
 */
async function recordOfferPurchase(
  supabase: Client,
  session: Stripe.Checkout.Session
) {
  const registrantId = session.metadata?.registrantId;
  const webinarId = session.metadata?.webinarId;
  const offerId = session.metadata?.offerId || null;
  const sessionId = session.metadata?.sessionId || null;

  if (!registrantId || !webinarId) return;

  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("external_reference", session.id)
    .maybeSingle();

  if (existing) return;

  const now = new Date().toISOString();

  await supabase.from("purchases").insert({
    webinar_id: webinarId,
    session_id: sessionId,
    registrant_id: registrantId,
    offer_id: offerId,
    amount_cents: session.amount_total ?? 0,
    currency: (session.currency ?? "usd").toUpperCase(),
    source: "stripe",
    external_reference: session.id,
  });

  await supabase
    .from("registrants")
    .update({ bought: true, bought_at: now, manually_marked_bought: false })
    .eq("id", registrantId);
}
