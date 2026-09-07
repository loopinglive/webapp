import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAnyAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const QUESTION_TYPES = ["multiple_choice", "rating", "text", "yes_no", "nps"] as const;

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(QUESTION_TYPES),
  label: z.string().min(1).max(300),
  options: z.array(z.string().max(100)).optional(),
});

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  questions: z.array(questionSchema).max(10).optional(),
  is_active: z.boolean().optional(),
});

/** Public: the survey config, if enabled — used to render the exit modal. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const service = createServiceClient();

  const { data: webinar } = await service
    .from("webinars")
    .select("exit_survey_enabled")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar?.exit_survey_enabled) return NextResponse.json({ survey: null });

  const { data: survey } = await service
    .from("exit_surveys")
    .select("id, title, questions, is_active")
    .eq("webinar_id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  return NextResponse.json({ survey: survey ?? null });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { error } = await createServiceClient()
    .from("exit_surveys")
    .upsert({ webinar_id: webinarId, ...parsed.data }, { onConflict: "webinar_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
