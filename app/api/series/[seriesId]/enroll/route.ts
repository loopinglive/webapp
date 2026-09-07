import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Enrols a registrant (already registered for the series' first webinar) into
 * series-wide progress tracking. Called right after the normal per-webinar
 * registration call succeeds on the public series page.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const { seriesId } = await params;
  const parsed = z
    .object({ email: z.string().email(), fullName: z.string().min(1) })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "email and fullName are required" }, { status: 422 });
  }

  const service = createServiceClient();

  const { data: firstItem } = await service
    .from("webinar_series_items")
    .select("webinar_id, position")
    .eq("series_id", seriesId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!firstItem) return NextResponse.json({ error: "Series has no webinars yet" }, { status: 404 });

  const email = parsed.data.email.trim().toLowerCase();

  const { error } = await service.from("series_progress").upsert(
    {
      series_id: seriesId,
      registrant_email: email,
      current_webinar_id: firstItem.webinar_id,
      completed_webinar_ids: [],
    },
    { onConflict: "series_id,registrant_email", ignoreDuplicates: true }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, firstWebinarId: firstItem.webinar_id });
}
