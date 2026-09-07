import { NextResponse } from "next/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Marks a recommendation as acted on -- a note for the host's own record, not something the app enforces. */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; optimisationId: string }> }
) {
  const { webinarId, optimisationId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from("schedule_optimisations")
    .update({ applied: true })
    .eq("id", optimisationId)
    .eq("webinar_id", webinarId)
    .select("*")
    .single();

  if (error || !row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ recommendation: row });
}
