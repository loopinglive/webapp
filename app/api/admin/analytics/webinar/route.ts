import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { getWebinarAnalytics } from "@/lib/analytics/queries";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Resolves a range param into concrete dates. Defaults to the last 30 days. */
export function resolveRange(params: URLSearchParams) {
  const preset = params.get("range") ?? "30d";
  const to = params.get("to") ? new Date(params.get("to")!) : new Date();

  if (preset === "custom" && params.get("from")) {
    return { from: new Date(params.get("from")!), to };
  }

  const days =
    preset === "7d" ? 7 : preset === "90d" ? 90 : preset === "all" ? 3650 : 30;

  return { from: new Date(to.getTime() - days * 86_400_000), to };
}

export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const webinarId = params.get("webinarId");

  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const { from, to } = resolveRange(params);
  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, video_duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  const analytics = await getWebinarAnalytics(supabase, webinarId, from, to);

  return NextResponse.json({ webinar, ...analytics });
}
