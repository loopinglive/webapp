import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWebinarAccess } from "@/lib/webinar-access";

import { createServiceClient } from "@/lib/supabase/server";
import type { AdCreativeRow } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({
  headline: z.string().min(1).max(200).trim().optional(),
  primaryText: z.string().min(1).max(1000).trim().optional(),
  description: z.string().max(500).trim().nullable().optional(),
  callToAction: z.string().min(1).max(40).trim().optional(),
  status: z.enum(["draft", "approved", "archived"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string; creativeId: string }> }
) {
  const { webinarId, creativeId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 422 });
  }

  const patch: Partial<AdCreativeRow> = {};
  if (parsed.data.headline !== undefined) patch.headline = parsed.data.headline;
  if (parsed.data.primaryText !== undefined) patch.primary_text = parsed.data.primaryText;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.callToAction !== undefined) patch.call_to_action = parsed.data.callToAction;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;

  const supabase = createServiceClient();
  const { data: creative, error } = await supabase
    .from("ad_creatives")
    .update(patch)
    .eq("id", creativeId)
    .eq("webinar_id", webinarId)
    .select("*")
    .single();

  if (error || !creative) {
    return NextResponse.json({ error: "Creative not found." }, { status: 404 });
  }

  return NextResponse.json({ creative });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; creativeId: string }> }
) {
  const { webinarId, creativeId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("ad_creatives")
    .delete()
    .eq("id", creativeId)
    .eq("webinar_id", webinarId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
