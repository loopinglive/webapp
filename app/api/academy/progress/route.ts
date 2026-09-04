import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
});

/**
 * Marks one lesson complete.
 *
 * `completed_lesson_ids` is read-modify-written rather than appended by the
 * database, because a course's completion also has to be recomputed here —
 * once every lesson in the course is in the list, `completed_at` is set, and
 * that comparison needs the full lesson list in hand anyway.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const [{ data: lesson }, { data: allLessons }, { data: existing }] = await Promise.all([
    supabase
      .from("academy_lessons")
      .select("id, course_id")
      .eq("id", parsed.data.lessonId)
      .eq("course_id", parsed.data.courseId)
      .maybeSingle(),
    supabase.from("academy_lessons").select("id").eq("course_id", parsed.data.courseId),
    supabase
      .from("academy_progress")
      .select("completed_lesson_ids")
      .eq("user_id", account.id)
      .eq("course_id", parsed.data.courseId)
      .maybeSingle(),
  ]);

  if (!lesson) {
    return NextResponse.json({ error: "That lesson is not in this course." }, { status: 400 });
  }

  const current = new Set((existing?.completed_lesson_ids as string[] | null) ?? []);
  current.add(parsed.data.lessonId);

  const allIds = new Set((allLessons ?? []).map((row) => row.id));
  const courseComplete = allIds.size > 0 && [...allIds].every((id) => current.has(id));

  const { error } = await supabase.from("academy_progress").upsert(
    {
      user_id: account.id,
      course_id: parsed.data.courseId,
      lesson_id: parsed.data.lessonId,
      completed_lesson_ids: [...current],
      completed_at: courseComplete ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,course_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    completedLessonIds: [...current],
    courseComplete,
  });
}
