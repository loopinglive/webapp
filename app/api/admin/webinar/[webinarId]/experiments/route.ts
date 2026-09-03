import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const [{ data: variants }, { data: results }, { data: offer }] = await Promise.all([
    supabase
      .from("offer_variants")
      .select("*")
      .eq("webinar_id", webinarId)
      .order("is_control", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.rpc("offer_experiment_results", { p_webinar_id: webinarId }),
    supabase
      .from("webinar_offers")
      .select("id, offer_title, button_text, price_cents, currency, trigger_video_offset_seconds")
      .eq("webinar_id", webinarId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    baseOffer: offer,
    variants: variants ?? [],
    results: results ?? [],
  });
}

const schema = z.object({
  name: z.string().min(1).max(60).trim(),
  isControl: z.boolean().default(false),
  weight: z.number().int().min(1).max(100).default(50),
  offerTitle: z.string().max(200).nullable().optional(),
  buttonText: z.string().max(80).nullable().optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  triggerVideoOffsetSeconds: z.number().int().min(0).nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Give the variant a name.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();

  const { data: offer } = await supabase
    .from("webinar_offers")
    .select("id")
    .eq("webinar_id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  if (!offer) {
    return NextResponse.json(
      { error: "Configure an offer before testing variants of it." },
      { status: 400 }
    );
  }

  // One control. A test with two controls is not a test.
  if (parsed.data.isControl) {
    await supabase
      .from("offer_variants")
      .update({ is_control: false })
      .eq("webinar_id", webinarId);
  }

  const { data, error } = await supabase
    .from("offer_variants")
    .insert({
      webinar_id: webinarId,
      offer_id: offer.id,
      name: parsed.data.name,
      is_control: parsed.data.isControl,
      weight: parsed.data.weight,
      // Null means inherit from the base offer, so only what is under test
      // is overridden.
      offer_title: parsed.data.offerTitle || null,
      button_text: parsed.data.buttonText || null,
      price_cents: parsed.data.priceCents ?? null,
      trigger_video_offset_seconds: parsed.data.triggerVideoOffsetSeconds ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variant: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "A variant is required." }, { status: 400 });

  // Deactivated rather than deleted: the assignments and the purchases that
  // came from them are the experiment's result, and removing the row would
  // orphan the numbers that justify the decision.
  await createServiceClient()
    .from("offer_variants")
    .update({ is_active: false })
    .eq("id", id)
    .eq("webinar_id", webinarId);

  return NextResponse.json({ success: true });
}
