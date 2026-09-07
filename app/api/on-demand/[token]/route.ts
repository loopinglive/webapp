import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function resolve(token: string) {
  const supabase = createServiceClient();

  const { data: access } = await supabase
    .from("on_demand_access")
    .select("id, webinar_id, registrant_id, expires_at, is_active, first_accessed_at")
    .eq("access_token", token)
    .maybeSingle();

  if (!access || !access.is_active) return null;
  if (access.expires_at && new Date(access.expires_at).getTime() < Date.now()) return null;

  return access;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const access = await resolve(token);
  if (!access) return NextResponse.json({ error: "This link has expired." }, { status: 410 });

  const supabase = createServiceClient();

  const [{ data: webinar }, { data: registrant }] = await Promise.all([
    supabase
      .from("webinars")
      .select("id, title, description, on_demand_allow_seek, video_duration_seconds, video_public_id, video_url")
      .eq("id", access.webinar_id)
      .maybeSingle(),
    supabase
      .from("registrants")
      .select("id, full_name, email, watch_percentage")
      .eq("id", access.registrant_id)
      .maybeSingle(),
  ]);

  if (!webinar || !registrant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase
    .from("on_demand_access")
    .update({
      ...(access.first_accessed_at ? {} : { first_accessed_at: new Date().toISOString() }),
      last_accessed_at: new Date().toISOString(),
    })
    .eq("id", access.id);

  return NextResponse.json({ webinar, registrant });
}

/** Progress ping — keeps on_demand_access in sync for the host's dashboard. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const access = await resolve(token);
  if (!access) return NextResponse.json({ error: "This link has expired." }, { status: 410 });

  const { watchSeconds, watchPercentage } = (await request.json().catch(() => ({}))) as {
    watchSeconds?: number;
    watchPercentage?: number;
  };

  await createServiceClient()
    .from("on_demand_access")
    .update({
      last_accessed_at: new Date().toISOString(),
      ...(typeof watchSeconds === "number" ? { watch_seconds: Math.round(watchSeconds) } : {}),
      ...(typeof watchPercentage === "number"
        ? { watch_percentage: Math.min(100, Math.max(0, watchPercentage)) }
        : {}),
    })
    .eq("id", access.id);

  return NextResponse.json({ ok: true });
}
