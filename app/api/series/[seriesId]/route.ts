import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  sequential_unlock: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

async function owns(seriesId: string, ownerId: string) {
  const { data } = await createServiceClient()
    .from("webinar_series")
    .select("id")
    .eq("id", seriesId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return Boolean(data);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const { seriesId } = await params;
  const service = createServiceClient();

  const { data: seriesRow } = await service
    .from("webinar_series")
    .select("id, owner_id, title, description, is_sequential, is_active, created_at")
    .eq("id", seriesId)
    .maybeSingle();

  if (!seriesRow) return NextResponse.json({ error: "Series not found" }, { status: 404 });
  if (!access.isPlatformAdmin && seriesRow.owner_id !== access.actorId) {
    return NextResponse.json({ error: "Series not found" }, { status: 404 });
  }

  const { id, owner_id, title, description, is_sequential, is_active, created_at } = seriesRow;
  const series = { id, owner_id, title, description, sequential_unlock: is_sequential, is_active, created_at };

  const { data: items } = await service
    .from("webinar_series_items")
    .select("id, webinar_id, position, unlock_delay_hours")
    .eq("series_id", seriesId)
    .order("position", { ascending: true });

  const webinarIds = (items ?? []).map((item) => item.webinar_id);
  const { data: webinars } = webinarIds.length
    ? await service.from("webinars").select("id, title, video_duration_seconds, is_active").in("id", webinarIds)
    : { data: [] };
  const byId = new Map((webinars ?? []).map((webinar) => [webinar.id, webinar]));

  return NextResponse.json({
    series,
    items: (items ?? []).map((item) => ({ ...item, webinar: byId.get(item.webinar_id) ?? null })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const { seriesId } = await params;
  if (!access.isPlatformAdmin && !(await owns(seriesId, access.actorId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const patch: { title?: string; description?: string | null; is_sequential?: boolean; is_active?: boolean } = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.sequential_unlock !== undefined) patch.is_sequential = parsed.data.sequential_unlock;
  if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active;

  const { error } = await createServiceClient()
    .from("webinar_series")
    .update(patch)
    .eq("id", seriesId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const { seriesId } = await params;
  if (!access.isPlatformAdmin && !(await owns(seriesId, access.actorId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await createServiceClient().from("webinar_series").delete().eq("id", seriesId);
  return NextResponse.json({ ok: true });
}
