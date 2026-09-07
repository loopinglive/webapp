import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { AbTestRow } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["running", "paused", "completed"]),
});

/** Status transitions only — a test's variants are fixed once created, so the results stay comparable. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string; testId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId, testId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const patch: Partial<AbTestRow> = { status: parsed.data.status };
  if (parsed.data.status === "running") patch.started_at = new Date().toISOString();
  if (parsed.data.status === "completed") patch.ended_at = new Date().toISOString();

  const { data: test, error } = await supabase
    .from("ab_tests")
    .update(patch)
    .eq("id", testId)
    .eq("webinar_id", webinarId)
    .select("*")
    .single();

  if (error || !test) {
    return NextResponse.json({ error: "Test not found." }, { status: 404 });
  }

  return NextResponse.json({ test });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; testId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId, testId } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("ab_tests")
    .delete()
    .eq("id", testId)
    .eq("webinar_id", webinarId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
