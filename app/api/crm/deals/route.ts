import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

type Activity = { at: string; type: string; detail: string };

/** Every deal route checks the pipeline belongs to the caller — deals are reached through their pipeline, never directly. */
async function ownsPipeline(pipelineId: string, userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("deal_pipelines").select("id").eq("id", pipelineId).eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

export async function GET(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const pipelineId = new URL(request.url).searchParams.get("pipelineId");
  if (!pipelineId) return NextResponse.json({ error: "pipelineId is required" }, { status: 400 });
  if (!(await ownsPipeline(pipelineId, account.id))) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const supabase = createServiceClient();
  const { data: deals } = await supabase
    .from("deals")
    .select(
      "id, webinar_id, registrant_id, title, value, stage, probability, expected_close_date, notes, activities, won, lost, lost_reason, created_at, updated_at, registrants(full_name, email)"
    )
    .eq("pipeline_id", pipelineId)
    .order("updated_at", { ascending: false })
    .limit(500);

  return NextResponse.json({ deals: deals ?? [] });
}

const createSchema = z.object({
  pipelineId: z.string().uuid(),
  title: z.string().min(1).max(160),
  value: z.number().min(0).max(10_000_000).optional(),
  stage: z.string().min(1).max(40),
  registrantId: z.string().uuid().optional(),
  webinarId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const input = parsed.data;
  if (!(await ownsPipeline(input.pipelineId, account.id))) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const supabase = createServiceClient();
  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      pipeline_id: input.pipelineId,
      webinar_id: input.webinarId ?? null,
      registrant_id: input.registrantId ?? null,
      title: input.title,
      value: input.value ?? 0,
      stage: input.stage,
      notes: input.notes ?? null,
      activities: [{ at: new Date().toISOString(), type: "created", detail: "Added by hand." }] as unknown as Json,
    })
    .select("id")
    .single();

  if (error || !deal) return NextResponse.json({ error: error?.message ?? "Could not create the deal." }, { status: 500 });
  return NextResponse.json({ deal });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  stage: z.string().min(1).max(40).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  value: z.number().min(0).max(10_000_000).optional(),
  notes: z.string().max(2000).optional(),
  won: z.boolean().optional(),
  lost: z.boolean().optional(),
  lostReason: z.string().max(300).optional(),
});

export async function PATCH(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const input = parsed.data;

  const supabase = createServiceClient();
  const { data: deal } = await supabase.from("deals").select("id, pipeline_id, stage, activities").eq("id", input.id).maybeSingle();
  if (!deal?.pipeline_id || !(await ownsPipeline(deal.pipeline_id, account.id))) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // The activity log is what makes a pipeline readable a week later — every
  // change that matters gets an entry rather than silently overwriting state.
  const activities = ((deal.activities as Activity[] | null) ?? []).slice(-49);
  if (input.stage && input.stage !== deal.stage) {
    activities.push({ at: new Date().toISOString(), type: "stage", detail: `Moved to ${input.stage}.` });
  }
  if (input.won) activities.push({ at: new Date().toISOString(), type: "won", detail: "Marked won." });
  if (input.lost) {
    activities.push({ at: new Date().toISOString(), type: "lost", detail: input.lostReason ? `Marked lost — ${input.lostReason}` : "Marked lost." });
  }

  const { error } = await supabase
    .from("deals")
    .update({
      ...(input.stage !== undefined && { stage: input.stage }),
      ...(input.probability !== undefined && { probability: input.probability }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.won !== undefined && { won: input.won, ...(input.won ? { lost: false, probability: 100 } : {}) }),
      ...(input.lost !== undefined && { lost: input.lost, ...(input.lost ? { won: false, probability: 0 } : {}) }),
      ...(input.lostReason !== undefined && { lost_reason: input.lostReason }),
      activities: activities as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: deal } = await supabase.from("deals").select("pipeline_id").eq("id", id).maybeSingle();
  if (!deal?.pipeline_id || !(await ownsPipeline(deal.pipeline_id, account.id))) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  await supabase.from("deals").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
