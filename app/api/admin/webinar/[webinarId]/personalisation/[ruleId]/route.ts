import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json, PersonalisationRuleRow } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  conditions: z.array(z.record(z.string(), z.unknown())).optional(),
  actions: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string; ruleId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId, ruleId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 422 });
  }

  const patch: Partial<PersonalisationRuleRow> = {};
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.conditions !== undefined) patch.conditions = parsed.data.conditions as unknown as Json;
  if (parsed.data.actions !== undefined) patch.actions = parsed.data.actions as unknown as Json;

  const supabase = createServiceClient();
  const { data: rule, error } = await supabase
    .from("personalisation_rules")
    .update(patch)
    .eq("id", ruleId)
    .eq("webinar_id", webinarId)
    .select("*")
    .single();

  if (error || !rule) {
    return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  }

  return NextResponse.json({ rule });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; ruleId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId, ruleId } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("personalisation_rules")
    .delete()
    .eq("id", ruleId)
    .eq("webinar_id", webinarId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
