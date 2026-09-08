import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The marketplace listing — every approved, active plugin. */
export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get("category");

  const supabase = createServiceClient();
  let query = supabase
    .from("plugins")
    .select(
      "id, name, slug, description, version, category, icon_url, screenshots, pricing_type, price, install_count, average_rating, manifest"
    )
    .eq("is_approved", true)
    .eq("is_active", true)
    .order("install_count", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data, error } = await query.limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plugins: data ?? [] });
}
