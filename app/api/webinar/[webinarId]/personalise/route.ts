import { NextResponse } from "next/server";

import { evaluateRulesForRegistrant } from "@/lib/intelligence/personalisation-engine";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * What a registrant should see, if anything, from this webinar's active
 * personalisation rules. Not yet called by the registration or watch-room
 * pages — see the comment on `evaluateRulesForRegistrant` for why.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const url = new URL(request.url);
  const registrantId = url.searchParams.get("registrantId");
  const sessionId = url.searchParams.get("sessionId");

  if (!registrantId) {
    return NextResponse.json({ error: "registrantId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const matched = await evaluateRulesForRegistrant(supabase, webinarId, registrantId, sessionId);

  return NextResponse.json({ matched });
}
