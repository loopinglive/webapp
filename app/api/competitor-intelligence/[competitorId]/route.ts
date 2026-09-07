import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { computePriceTrend, type Observation } from "@/lib/intelligence/competitor-intelligence";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({
  priceCents: z.number().int().min(0).nullable().optional(),
  offerHeadline: z.string().max(200).trim().nullable().optional(),
  notes: z.string().max(1000).trim().nullable().optional(),
});

/** Appends one dated observation the host is logging themselves. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ competitorId: string }> }
) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { competitorId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid observation." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data: competitor } = await supabase
    .from("competitor_intelligence")
    .select("data_points")
    .eq("id", competitorId)
    .eq("user_id", account.id)
    .maybeSingle();

  if (!competitor) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const observations = ((competitor.data_points as unknown as Observation[]) ?? []).concat({
    date: new Date().toISOString().slice(0, 10),
    priceCents: parsed.data.priceCents ?? null,
    offerHeadline: parsed.data.offerHeadline ?? null,
    notes: parsed.data.notes ?? null,
  });

  const { data: updated, error } = await supabase
    .from("competitor_intelligence")
    .update({ data_points: observations as unknown as Json, last_analysed_at: new Date().toISOString() })
    .eq("id", competitorId)
    .select("*")
    .single();

  if (error || !updated) return NextResponse.json({ error: "Could not save observation." }, { status: 500 });

  return NextResponse.json({ competitor: { ...updated, trend: computePriceTrend(observations) } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ competitorId: string }> }
) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { competitorId } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("competitor_intelligence")
    .delete()
    .eq("id", competitorId)
    .eq("user_id", account.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
