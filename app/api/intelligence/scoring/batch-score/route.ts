import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { scoreRegistrant } from "@/lib/intelligence/scoring-engine";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ webinarId: z.string().uuid() });

/**
 * Scores every attendee of one webinar.
 *
 * Only those who actually attended — a registrant who never joined has
 * nothing to score, and scoring them anyway would put a zero-engagement row
 * in the leaderboard for someone who was never in the room to disengage.
 * Sequential rather than parallel: this can run to a few hundred rows, and
 * a burst of a few hundred concurrent writes to one table is worse than
 * taking a few seconds longer.
 */
export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: registrants } = await supabase
    .from("registrants")
    .select("id")
    .eq("webinar_id", parsed.data.webinarId)
    .eq("attended", true)
    .eq("is_test", false);

  let scored = 0;
  let failed = 0;

  for (const registrant of registrants ?? []) {
    try {
      await scoreRegistrant(supabase, registrant.id, parsed.data.webinarId);
      scored += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ scored, failed, total: registrants?.length ?? 0 });
}
