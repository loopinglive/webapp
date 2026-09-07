import { NextResponse } from "next/server";
import { computeResults } from "@/lib/intelligence/ab-testing-engine";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

/** Always recomputed from live assignments — never served from a stale cache. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; testId: string }> }
) {
  const { webinarId, testId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  // computeResults trusts testId alone -- confirm it actually belongs to
  // this webinar before handing it a test id from someone else's.
  const { data: test } = await supabase
    .from("ab_tests")
    .select("id")
    .eq("id", testId)
    .eq("webinar_id", webinarId)
    .maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const results = await computeResults(supabase, testId);
  return NextResponse.json(results);
}
