import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { evaluateSegmentMembers } from "@/lib/intelligence/segments-engine";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: segments } = await supabase
    .from("smart_segments")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ segments: segments ?? [] });
}

const conditionSchema = z.object({
  field: z.enum(["deviceType", "countryCode", "returningAttendee", "watchPercentage", "clickedOffer", "utmSource"]),
  operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const schema = z.object({
  name: z.string().min(1).max(120).trim(),
  description: z.string().max(300).trim().nullable().optional(),
  conditions: z.array(conditionSchema).max(10),
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
    return NextResponse.json({ error: "Invalid segment." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const members = await evaluateSegmentMembers(supabase, webinarId, parsed.data.conditions);

  const { data: segment, error } = await supabase
    .from("smart_segments")
    .insert({
      webinar_id: webinarId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      conditions: parsed.data.conditions as unknown as Json,
      registrant_count: members.length,
      last_evaluated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !segment) {
    return NextResponse.json({ error: error?.message ?? "Could not create segment." }, { status: 500 });
  }

  return NextResponse.json({ segment });
}
