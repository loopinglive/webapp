import { NextResponse } from "next/server";
import { z } from "zod";

import { scoreRegistrant } from "@/lib/intelligence/scoring-engine";
import { createServiceClient } from "@/lib/supabase/server";
import { requireRegistrantAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

const schema = z.object({ registrantId: z.string().uuid() });

/** Scores one attendee, on demand — the leaderboard's "refresh this one" action. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "registrantId is required" }, { status: 422 });
  }

  const access = await requireRegistrantAccess(parsed.data.registrantId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  const { data: registrant } = await supabase
    .from("registrants")
    .select("webinar_id")
    .eq("id", parsed.data.registrantId)
    .maybeSingle();

  if (!registrant) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const result = await scoreRegistrant(supabase, parsed.data.registrantId, registrant.webinar_id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
