import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { generateRecommendation } from "@/lib/intelligence/scheduling-engine";
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

  const { data: latest } = await supabase
    .from("schedule_optimisations")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ latest: latest ?? null });
}

/** Recomputes from this webinar's ended, non-test sessions and stores a fresh snapshot. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  try {
    const result = await generateRecommendation(supabase, webinarId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
