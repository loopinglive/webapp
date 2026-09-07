import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const parsed = z
    .object({
      registrantId: z.string().uuid(),
      sessionId: z.string().uuid().nullable().optional(),
      responses: z.record(z.string(), z.unknown()),
    })
    .safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 422 });
  }

  const supabase = createServiceClient();
  const sessionId = parsed.data.sessionId ?? null;

  // The unique index is an expression (coalescing a null session_id), which
  // supabase-js's upsert cannot target directly — so conflicts are resolved
  // by hand: update the existing response if one exists, insert otherwise.
  let existingQuery = supabase
    .from("exit_survey_responses")
    .select("id")
    .eq("webinar_id", webinarId)
    .eq("registrant_id", parsed.data.registrantId);

  existingQuery = sessionId
    ? existingQuery.eq("session_id", sessionId)
    : existingQuery.is("session_id", null);

  const { data: existing } = await existingQuery.maybeSingle();

  const { error } = existing
    ? await supabase
        .from("exit_survey_responses")
        .update({ responses: parsed.data.responses as unknown as Json, submitted_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("exit_survey_responses").insert({
        webinar_id: webinarId,
        registrant_id: parsed.data.registrantId,
        session_id: sessionId,
        responses: parsed.data.responses as unknown as Json,
      });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
