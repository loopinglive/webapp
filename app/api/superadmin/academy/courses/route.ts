import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Every course, published or not — the admin's own view. */
export async function GET() {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const { data } = await createServiceClient()
    .from("academy_courses")
    .select("*")
    .order("position", { ascending: true });

  return NextResponse.json({ courses: data ?? [] });
}

const schema = z.object({
  title: z.string().min(3).max(160).trim(),
  description: z.string().min(10).max(2000).trim(),
  category: z.string().min(1).max(60),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  estimatedMinutes: z.number().int().min(1),
  thumbnailUrl: z.string().url().optional(),
  isFree: z.boolean().default(true),
});

export async function POST(request: Request) {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the required fields." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("academy_courses")
    .select("id", { count: "exact", head: true });

  const { data: course, error } = await supabase
    .from("academy_courses")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      difficulty: parsed.data.difficulty,
      estimated_minutes: parsed.data.estimatedMinutes,
      thumbnail_url: parsed.data.thumbnailUrl || null,
      is_free: parsed.data.isFree,
      // New courses start unpublished; position at the end of the list.
      is_published: false,
      position: count ?? 0,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ course });
}
