import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  handoutId: z.string().uuid(),
  registrantId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  videoOffsetSeconds: z.number().int().min(0).optional(),
});

/**
 * Records that someone took a handout.
 *
 * A download is one of the strongest buying signals a webinar produces, and
 * nothing was capturing it. Unique on (handout, registrant) so the first take
 * is the one that counts -- a second click is the same intent, not a second
 * signal.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("handout_downloads").insert({
    handout_id: parsed.data.handoutId,
    registrant_id: parsed.data.registrantId,
    session_id: parsed.data.sessionId ?? null,
    video_offset_seconds: parsed.data.videoOffsetSeconds ?? null,
  });

  // A repeat download is a no-op, not a failure worth showing anyone.
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
