import { NextResponse } from "next/server";

import { logEvent } from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Records that someone took a handout or clicked a CTA.
 *
 * `timed_handouts` and `timed_ctas` existed with nothing recording who acted
 * on them, so the strongest buying signal short of a purchase — someone
 * downloading the workbook forty minutes in — was going nowhere.
 *
 * Deliberately fire-and-forget from the client: the download starts either
 * way. A tracking call that could block a download would be a worse product
 * than no tracking.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const { registrantId, sessionId, kind, itemId, title } =
    (await request.json()) as {
      registrantId?: string;
      sessionId?: string;
      kind?: "handout" | "cta";
      itemId?: string;
      title?: string;
    };

  if (!registrantId || !itemId || (kind !== "handout" && kind !== "cta")) {
    return NextResponse.json(
      { error: "registrantId, itemId and a valid kind are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // The registrant has to belong to this webinar, or any registrant id would
  // let someone write events onto a stranger's record.
  const { data: registrant } = await supabase
    .from("registrants")
    .select("id")
    .eq("id", registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!registrant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logEvent(supabase, {
    registrantId,
    sessionId: sessionId ?? null,
    type: kind === "handout" ? "handout_downloaded" : "cta_clicked",
    data: { itemId, title: title ?? null },
  });

  return NextResponse.json({ ok: true });
}
