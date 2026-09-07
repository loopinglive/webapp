import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWebinarAccess } from "@/lib/webinar-access";

import { createServiceClient } from "@/lib/supabase/server";
import type { AiInsightRow } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({
  isRead: z.boolean().optional(),
  isDismissed: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string; insightId: string }> }
) {
  const { webinarId, insightId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 422 });
  }

  const patch: Partial<AiInsightRow> = {};
  if (parsed.data.isRead !== undefined) patch.is_read = parsed.data.isRead;
  if (parsed.data.isDismissed !== undefined) patch.is_dismissed = parsed.data.isDismissed;

  const supabase = createServiceClient();
  const { data: insight, error } = await supabase
    .from("ai_insights")
    .update(patch)
    .eq("id", insightId)
    .eq("webinar_id", webinarId)
    .select("*")
    .single();

  if (error || !insight) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ insight });
}
