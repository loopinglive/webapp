import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Published courses, free for everyone including the free plan. */
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("academy_courses")
    .select("*")
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ courses: data ?? [] });
}
