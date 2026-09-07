import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Grants (or returns the existing) on-demand access link for a registrant. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const parsed = z.object({ registrantId: z.string().uuid() }).safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "registrantId is required" }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, on_demand_enabled, on_demand_expires_hours")
    .eq("id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  if (!webinar?.on_demand_enabled) {
    return NextResponse.json({ error: "On-demand is not enabled for this webinar." }, { status: 403 });
  }

  const { data: registrant } = await supabase
    .from("registrants")
    .select("id")
    .eq("id", parsed.data.registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();
  if (!registrant) return NextResponse.json({ error: "Registrant not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("on_demand_access")
    .select("access_token")
    .eq("webinar_id", webinarId)
    .eq("registrant_id", registrant.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ token: existing.access_token });

  const expiresAt = webinar.on_demand_expires_hours
    ? new Date(Date.now() + webinar.on_demand_expires_hours * 60 * 60 * 1000).toISOString()
    : null;

  const token = randomUUID();

  const { error } = await supabase.from("on_demand_access").insert({
    webinar_id: webinarId,
    registrant_id: registrant.id,
    access_token: token,
    expires_at: expiresAt,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token });
}
