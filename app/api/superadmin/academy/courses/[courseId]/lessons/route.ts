import { NextResponse } from "next/server";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** A course's lessons, including one that is not published yet. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const { courseId } = await params;
  const supabase = createServiceClient();

  const [{ data: course }, { data: lessons }] = await Promise.all([
    supabase.from("academy_courses").select("*").eq("id", courseId).maybeSingle(),
    supabase
      .from("academy_lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("position", { ascending: true }),
  ]);

  if (!course) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ course, lessons: lessons ?? [] });
}
