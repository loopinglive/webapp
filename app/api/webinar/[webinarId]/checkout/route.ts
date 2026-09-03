import { NextResponse } from "next/server";
import { z } from "zod";

import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { SITE } from "@/lib/constants";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({
  registrantId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  /** They ticked the order bump. Ignored if the offer has none. */
  includeBump: z.boolean().optional(),
});

/**
 * Checkout for the host's offer, without leaving the room.
 *
 * The offer button links out today, which loses people at the moment they
 * decided. This creates a Stripe Checkout session for the offer's own price
 * and returns its URL, so the purchase completes in a tab the attendee can
 * close and come straight back from.
 *
 * Note this charges on the platform's Stripe account. Routing money to the
 * host's own account needs Stripe Connect, which is a bigger piece of work --
 * until then, this is for hosts who are happy to be paid out by you.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  if (!billingConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured on this deployment." },
      { status: 503 }
    );
  }

  const limit = rateLimit(`checkout:${clientIp(request)}`, {
    limit: 10,
    windowSeconds: 60,
  });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const { webinarId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Register first." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const [{ data: offer }, { data: registrant }] = await Promise.all([
    supabase
      .from("webinar_offers")
      .select("id, offer_title, offer_description, price_cents, currency")
      .eq("webinar_id", webinarId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("registrants")
      .select("id, email, full_name")
      .eq("id", parsed.data.registrantId)
      .eq("webinar_id", webinarId)
      .maybeSingle(),
  ]);

  // The bump's price is read fresh here rather than trusted from the request —
  // the client sends only whether the box was ticked, never an amount.
  const { data: bump } =
    parsed.data.includeBump && offer
      ? await supabase
          .from("webinar_offer_bumps")
          .select("id, title, price_cents, currency")
          .eq("offer_id", offer.id)
          .eq("is_active", true)
          .maybeSingle()
      : { data: null };

  if (!offer) {
    return NextResponse.json({ error: "No offer is configured." }, { status: 404 });
  }
  if (!registrant) {
    return NextResponse.json({ error: "Register to buy." }, { status: 403 });
  }
  // An unpriced offer cannot be charged for -- the host is selling it
  // elsewhere, and the button should link out as before.
  if (!offer.price_cents || offer.price_cents <= 0) {
    return NextResponse.json(
      { error: "This offer has no price set.", useExternalUrl: true },
      { status: 409 }
    );
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: registrant.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: (offer.currency || "usd").toLowerCase(),
          unit_amount: offer.price_cents,
          product_data: {
            name: offer.offer_title,
            ...(offer.offer_description
              ? { description: offer.offer_description.slice(0, 500) }
              : {}),
          },
        },
      },
      // A second line item for the bump, so it appears on the Stripe receipt
      // as its own thing rather than folded into the main price.
      ...(bump
        ? [
            {
              quantity: 1,
              price_data: {
                currency: (bump.currency || offer.currency || "usd").toLowerCase(),
                unit_amount: bump.price_cents,
                product_data: { name: bump.title },
              },
            },
          ]
        : []),
    ],
    // Back into the room, not to a generic thank-you page: the webinar is
    // probably still playing and they should not lose their place.
    success_url: `${SITE.url}/webinar/${webinarId}/watch?purchased=1`,
    cancel_url: `${SITE.url}/webinar/${webinarId}/watch`,
    // Read back by the webhook to mark the purchase against the right person.
    metadata: {
      kind: "webinar_offer",
      webinarId,
      offerId: offer.id,
      registrantId: registrant.id,
      sessionId: parsed.data.sessionId ?? "",
      /*
       * The offer's price at the moment of checkout, captured here rather
       * than re-read from the amount Stripe settles on. Splitting
       * amount_total back into "offer" and "bump" from the total alone would
       * break the moment a coupon, tax, or a price change lands between
       * checkout and the webhook firing.
       */
      offerAmountCents: String(offer.price_cents),
      bumpId: bump?.id ?? "",
      bumpAmountCents: bump ? String(bump.price_cents) : "",
    },
  });

  return NextResponse.json({ url: session.url });
}
