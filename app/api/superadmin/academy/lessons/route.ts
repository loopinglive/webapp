import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2).max(160).trim(),
  description: z.string().max(2000).trim().optional(),
  videoUrl: z.string().url().optional(),
  durationSeconds: z.number().int().min(1).optional(),
  isPreview: z.boolean().default(false),
});

export async function POST(request: Request) {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "A title is required." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("academy_lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", parsed.data.courseId);

  const { data: lesson, error } = await supabase
    .from("academy_lessons")
    .insert({
      course_id: parsed.data.courseId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      video_url: parsed.data.videoUrl || null,
      duration_seconds: parsed.data.durationSeconds ?? null,
      is_preview: parsed.data.isPreview,
      position: count ?? 0,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lesson });
}

const deleteSchema = z.object({ lessonId: z.string().uuid() });

export async function DELETE(request: Request) {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get("lessonId");
  const parsed = deleteSchema.safeParse({ lessonId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  }

  await createServiceClient().from("academy_lessons").delete().eq("id", parsed.data.lessonId);
  return NextResponse.json({ success: true });
}
