import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { computeResults } from "@/lib/intelligence/ab-testing-engine";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Always recomputed from live assignments — never served from a stale cache. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; testId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { testId } = await params;
  const supabase = createServiceClient();

  const results = await computeResults(supabase, testId);
  return NextResponse.json(results);
}
