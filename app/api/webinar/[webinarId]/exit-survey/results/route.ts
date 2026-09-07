import { NextResponse } from "next/server";

import { requireAnyAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { data } = await createServiceClient()
    .from("exit_survey_responses")
    .select("responses, submitted_at")
    .eq("webinar_id", webinarId)
    .order("submitted_at", { ascending: false })
    .limit(500);

  const rows = data ?? [];

  // Aggregate per question id: counts for choice-style answers, average for
  // numeric ones — enough for a quick read without a charting library.
  const aggregate: Record<string, { counts: Record<string, number>; numeric: number[] }> = {};

  for (const row of rows) {
    const responses = row.responses as Record<string, unknown>;
    for (const [questionId, answer] of Object.entries(responses)) {
      aggregate[questionId] ??= { counts: {}, numeric: [] };
      if (typeof answer === "number") {
        aggregate[questionId].numeric.push(answer);
      } else {
        const key = String(answer);
        aggregate[questionId].counts[key] = (aggregate[questionId].counts[key] ?? 0) + 1;
      }
    }
  }

  return NextResponse.json({ total: rows.length, aggregate });
}
