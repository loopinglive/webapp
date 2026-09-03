import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).max(120).trim(),
  description: z.string().max(500).trim().optional(),
  // Whole currency units, as typed; stored in cents like the offer itself.
  price: z.coerce.number().positive(),
  currency: z.string().length(3).default("USD"),
  isActive: z.boolean().default(true),
});

/**
 * The one companion offer at checkout.
 *
 * Upserts on the offer's own id, matching how the offer itself is stored —
 * one row per offer, not a list, because a checkout with several add-ons stops
 * reading as a decision already made.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A title and a price above zero are required." },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();

  const { data: offer } = await supabase
    .from("webinar_offers")
    .select("id")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!offer) {
    return NextResponse.json(
      { error: "Set up the main offer before adding a bump to it." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("webinar_offer_bumps")
    .upsert(
      {
        offer_id: offer.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        price_cents: Math.round(parsed.data.price * 100),
        currency: parsed.data.currency.toUpperCase(),
        is_active: parsed.data.isActive,
      },
      { onConflict: "offer_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bump: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: offer } = await supabase
    .from("webinar_offers")
    .select("id")
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (offer) {
    await supabase.from("webinar_offer_bumps").delete().eq("offer_id", offer.id);
  }

  return NextResponse.json({ success: true });
}
