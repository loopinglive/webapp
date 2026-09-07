import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  sequential_unlock: z.boolean().default(true),
});

export async function GET() {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const service = createServiceClient();
  const { data: series } = await service
    .from("webinar_series")
    .select("id, title, description, is_sequential, is_active, created_at")
    .eq("owner_id", access.actorId)
    .order("created_at", { ascending: false });

  const ids = (series ?? []).map((row) => row.id);
  const { data: items } = ids.length
    ? await service
        .from("webinar_series_items")
        .select("series_id")
        .in("series_id", ids)
    : { data: [] };

  const counts = new Map<string, number>();
  for (const item of items ?? []) {
    counts.set(item.series_id, (counts.get(item.series_id) ?? 0) + 1);
  }

  return NextResponse.json({
    series: (series ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      sequential_unlock: row.is_sequential,
      is_active: row.is_active,
      created_at: row.created_at,
      itemCount: counts.get(row.id) ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { data, error } = await createServiceClient()
    .from("webinar_series")
    .insert({
      owner_id: access.actorId,
      title: parsed.data.title,
      description: parsed.data.description,
      is_sequential: parsed.data.sequential_unlock,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create series." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
