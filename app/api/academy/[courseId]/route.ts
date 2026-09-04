import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** A course, its lessons in order, and the signed-in viewer's own progress. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  const supabase = createServiceClient();

  const { data: course } = await supabase
    .from("academy_courses")
    .select("*")
    .eq("id", courseId)
    .eq("is_published", true)
    .maybeSingle();

  if (!course) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: lessons } = await supabase
    .from("academy_lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const account = await getUserAccount();
  let completedLessonIds: string[] = [];

  if (account) {
    const { data: progress } = await supabase
      .from("academy_progress")
      .select("completed_lesson_ids")
      .eq("user_id", account.id)
      .eq("course_id", courseId)
      .maybeSingle();

    completedLessonIds = (progress?.completed_lesson_ids as string[] | null) ?? [];
  }

  return NextResponse.json({
    course,
    lessons: lessons ?? [],
    completedLessonIds,
  });
}
