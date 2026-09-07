import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess, requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

async function owns(seriesId: string, ownerId: string) {
  const { data } = await createServiceClient()
    .from("webinar_series")
    .select("id")
    .eq("id", seriesId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return Boolean(data);
}

/** Add a webinar to the end of the series. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const { seriesId } = await params;
  if (!access.isPlatformAdmin && !(await owns(seriesId, access.actorId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = z
    .object({ webinarId: z.string().uuid(), unlockDelayHours: z.number().min(0).max(720).default(0) })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 422 });
  }

  const service = createServiceClient();

  const { data: webinar } = await service
    .from("webinars")
    .select("id")
    .eq("id", parsed.data.webinarId)
    .maybeSingle();
  if (!webinar) return NextResponse.json({ error: "Webinar not found" }, { status: 404 });

  const webinarAccess = await requireWebinarAccess(parsed.data.webinarId);
  if (!webinarAccess.ok) return webinarAccess.response;

  const { data: last } = await service
    .from("webinar_series_items")
    .select("position")
    .eq("series_id", seriesId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? 0) + 1;

  const { error } = await service.from("webinar_series_items").insert({
    series_id: seriesId,
    webinar_id: parsed.data.webinarId,
    position,
    unlock_delay_hours: parsed.data.unlockDelayHours,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That webinar is already in this series." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await service.from("webinars").update({ series_id: seriesId }).eq("id", parsed.data.webinarId);

  return NextResponse.json({ ok: true });
}

/** Reorder items — body is the full ordered list of item ids. */
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

  const parsed = z.object({ orderedItemIds: z.array(z.string().uuid()) }).safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "orderedItemIds is required" }, { status: 422 });
  }

  const service = createServiceClient();
  await Promise.all(
    parsed.data.orderedItemIds.map((id, index) =>
      service
        .from("webinar_series_items")
        .update({ position: index + 1 })
        .eq("id", id)
        .eq("series_id", seriesId)
    )
  );

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

  const parsed = z.object({ itemId: z.string().uuid() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "itemId is required" }, { status: 422 });

  await createServiceClient()
    .from("webinar_series_items")
    .delete()
    .eq("id", parsed.data.itemId)
    .eq("series_id", seriesId);

  return NextResponse.json({ ok: true });
}
