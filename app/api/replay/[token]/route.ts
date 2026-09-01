import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Replay watch progress, tracked separately from the live session's. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { watchSeconds, watchPercentage } = (await request.json()) as {
    watchSeconds?: number;
    watchPercentage?: number;
  };

  const supabase = createServiceClient();

  const { data: access } = await supabase
    .from("replay_access")
    .select("id, expires_at, is_active, watch_seconds")
    .eq("access_token", token)
    .maybeSingle();

  if (!access || !access.is_active) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (new Date(access.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  await supabase
    .from("replay_access")
    .update({
      // Only ever moves forward — scrubbing back should not erase progress.
      watch_seconds: Math.max(access.watch_seconds ?? 0, Math.round(watchSeconds ?? 0)),
      watch_percentage: Math.min(100, Math.max(0, watchPercentage ?? 0)),
      last_accessed_at: new Date().toISOString(),
    })
    .eq("id", access.id);

  return NextResponse.json({ ok: true });
}
