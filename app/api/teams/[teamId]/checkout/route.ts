import { NextResponse } from "next/server";
import { z } from "zod";

import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { SITE } from "@/lib/constants";
import { requireTeamCapability } from "@/lib/teams/auth";
import { TEAM_PLAN_BY_ID } from "@/lib/teams/plans";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  planId: z.enum(["team_starter", "team_pro"]),
});

/**
 * Starts (or changes) the team's subscription.
 *
 * Priced inline with `price_data` rather than a pre-created Stripe Price —
 * the same choice already made for a webinar offer's checkout, and for the
 * same reason: it means shipping a plan change without a manual step in the
 * Stripe dashboard first.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  if (!billingConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured on this deployment." },
      { status: 503 }
    );
  }

  const { teamId } = await params;
  const { account, response: denied } = await requireTeamCapability(
    teamId,
    "manage_billing"
  );
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a plan." }, { status: 422 });
  }

  const plan = TEAM_PLAN_BY_ID.get(parsed.data.planId)!;

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: account.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan.priceCents,
          recurring: { interval: "month" },
          product_data: { name: plan.name },
        },
      },
    ],
    success_url: `${SITE.url}/team/billing?upgraded=1`,
    cancel_url: `${SITE.url}/team/billing`,
    metadata: {
      kind: "team_subscription",
      teamId,
      planId: plan.id,
    },
  });

  return NextResponse.json({ url: session.url });
}

/** Cancels at period end, through the same portal individual billing uses. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  if (!billingConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured on this deployment." },
      { status: 503 }
    );
  }

  const { teamId } = await params;
  const { response: denied } = await requireTeamCapability(teamId, "manage_billing");
  if (denied) return denied;

  const supabase = createServiceClient();
  const { data: team } = await supabase
    .from("teams")
    .select("stripe_customer_id")
    .eq("id", teamId)
    .maybeSingle();

  if (!team?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription on file." }, { status: 400 });
  }

  const portal = await stripe().billingPortal.sessions.create({
    customer: team.stripe_customer_id,
    return_url: `${SITE.url}/team/billing`,
  });

  return NextResponse.json({ url: portal.url });
}
