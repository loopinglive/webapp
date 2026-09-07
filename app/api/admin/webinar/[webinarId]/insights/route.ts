import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { generateInsightsForWebinar } from "@/lib/intelligence/insights-engine";
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

  const { data: insights } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("webinar_id", webinarId)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false });

  // Text-sorted "high" < "low" < "medium" is not the order a host wants --
  // rank explicitly rather than relying on the column's alphabetical order.
  const rank = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...(insights ?? [])].sort((a, b) => rank[a.priority] - rank[b.priority]);

  return NextResponse.json({ insights: sorted });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("owner_id")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) return NextResponse.json({ error: "Webinar not found." }, { status: 404 });

  const inserted = await generateInsightsForWebinar(supabase, webinarId, webinar.owner_id);
  return NextResponse.json({ inserted });
}
