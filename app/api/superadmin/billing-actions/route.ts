import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("refund"),
    invoiceId: z.string().uuid(),
    reason: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal("extend_trial"),
    userId: z.string().uuid(),
    days: z.number().int().min(1).max(90),
  }),
  z.object({
    action: z.literal("extend_plan"),
    userId: z.string().uuid(),
    days: z.number().int().min(1).max(365),
  }),
]);

/**
 * The concessions support actually makes.
 *
 * A 30-day guarantee is a promise in the Terms with no button behind it —
 * honouring it meant opening Stripe and then remembering to reflect it here.
 * Extending a trial or a plan is the other half: the two things that most
 * reliably save a cancellation, and both were manual.
 */
export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireCapability("billing_actions");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();
  const body = parsed.data;

  // ── Refund ──
  if (body.action === "refund") {
    if (!billingConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured on this deployment." },
        { status: 503 }
      );
    }

    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, user_id, amount, currency, status, stripe_payment_intent_id, plan_slug")
      .eq("id", body.invoiceId)
      .maybeSingle();

    if (!invoice) {
      return NextResponse.json({ error: "No such invoice." }, { status: 404 });
    }
    if (invoice.status !== "paid") {
      return NextResponse.json(
        { error: `That invoice is ${invoice.status}, not paid.` },
        { status: 400 }
      );
    }
    if (!invoice.stripe_payment_intent_id) {
      return NextResponse.json(
        {
          error:
            "This invoice has no Stripe payment behind it — it was granted, not bought.",
        },
        { status: 400 }
      );
    }

    try {
      await stripe().refunds.create({
        payment_intent: invoice.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: { adminId: admin.id, note: body.reason ?? "" },
      });
    } catch (error) {
      return NextResponse.json(
        { error: `Stripe refused the refund: ${(error as Error).message}` },
        { status: 502 }
      );
    }

    await supabase
      .from("invoices")
      .update({ status: "refunded" })
      .eq("id", invoice.id);

    // The plan goes with the money. Leaving someone on a paid plan after
    // refunding them is a support ticket waiting to happen.
    if (invoice.user_id) {
      await supabase
        .from("user_accounts")
        .update({
          plan_slug: "free",
          subscription_status: "cancelled",
          plan_expires_at: new Date().toISOString(),
        })
        .eq("id", invoice.user_id);
    }

    await supabase.from("admin_actions").insert({
      admin_id: admin.id,
      target_user_id: invoice.user_id,
      action: "refunded",
      detail: {
        invoiceId: invoice.id,
        amount: invoice.amount,
        currency: invoice.currency,
        reason: body.reason ?? null,
      } as never,
    });

    return NextResponse.json({ success: true, amount: invoice.amount });
  }

  // ── Extend a trial or a plan ──
  const { data: account } = await supabase
    .from("user_accounts")
    .select("id, trial_ends_at, plan_expires_at, plan_slug")
    .eq("id", body.userId)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "No such user." }, { status: 404 });
  }

  const field = body.action === "extend_trial" ? "trial_ends_at" : "plan_expires_at";
  const current = account[field];

  // Extend from whichever is later. Extending from a date that has already
  // passed gives someone less time than they were promised.
  const from =
    current && new Date(current) > new Date() ? new Date(current) : new Date();
  from.setDate(from.getDate() + body.days);

  await supabase
    .from("user_accounts")
    .update({
      [field]: from.toISOString(),
      ...(body.action === "extend_plan" ? { subscription_status: "active" } : {}),
    })
    .eq("id", account.id);

  await supabase.from("admin_actions").insert({
    admin_id: admin.id,
    target_user_id: account.id,
    action: body.action,
    detail: { days: body.days, until: from.toISOString() } as never,
  });

  return NextResponse.json({ success: true, until: from.toISOString() });
}
