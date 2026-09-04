import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";
import type { AcademyCourseRow } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(3).max(160).trim().optional(),
  description: z.string().min(10).max(2000).trim().optional(),
  category: z.string().min(1).max(60).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  isFree: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  position: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const { courseId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  // A course with no lessons cannot go live — a published course with
  // nothing in it is a dead end a viewer would land on.
  if (parsed.data.isPublished) {
    const supabase = createServiceClient();
    const { count } = await supabase
      .from("academy_lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId);

    if (!count) {
      return NextResponse.json(
        { error: "Add at least one lesson before publishing." },
        { status: 400 }
      );
    }
  }

  const patch: Partial<AcademyCourseRow> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.category !== undefined) patch.category = parsed.data.category;
  if (parsed.data.difficulty !== undefined) patch.difficulty = parsed.data.difficulty;
  if (parsed.data.estimatedMinutes !== undefined) {
    patch.estimated_minutes = parsed.data.estimatedMinutes;
  }
  if (parsed.data.thumbnailUrl !== undefined) patch.thumbnail_url = parsed.data.thumbnailUrl;
  if (parsed.data.isFree !== undefined) patch.is_free = parsed.data.isFree;
  if (parsed.data.isPublished !== undefined) patch.is_published = parsed.data.isPublished;
  if (parsed.data.position !== undefined) patch.position = parsed.data.position;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("academy_courses")
    .update(patch)
    .eq("id", courseId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ course: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const { courseId } = await params;
  await createServiceClient().from("academy_courses").delete().eq("id", courseId);
  return NextResponse.json({ success: true });
}
