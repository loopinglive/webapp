import { NextResponse } from "next/server";

import { logEvent } from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Records that someone clicked a timed CTA.
 *
 * `timed_ctas` existed with nothing recording who acted on it. Handouts are
 * deliberately *not* handled here: `handout_downloads` and
 * `/api/handouts/download` already existed for that from migration 0018 — the
 * UI simply never called them. Recording the same fact in two places is how
 * two screens come to report different numbers, so the client sends handouts
 * there and CTAs here.
 *
 * Deliberately fire-and-forget from the client: the link opens either way. A
 * tracking call that could block it would be a worse product than no tracking.
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
      kind?: "cta";
      itemId?: string;
      title?: string;
    };

  if (!registrantId || !itemId || kind !== "cta") {
    return NextResponse.json(
      { error: "registrantId, itemId and kind 'cta' are required" },
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
    type: "cta_clicked",
    data: { itemId, title: title ?? null },
  });

  return NextResponse.json({ ok: true });
}
