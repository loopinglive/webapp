import { NextResponse } from "next/server";
import { z } from "zod";

import { predictForRegistrant } from "@/lib/nurture/predict";
import { SITE } from "@/lib/constants";
import { requireWebinarAccess } from "@/lib/webinar-access";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_PROPOSALS_PER_RUN = 50;

export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data: sequences } = await supabase
    .from("predictive_nurture_sequences")
    .select(
      "id, registrant_id, sequence_type, predicted_conversion_date, optimal_contact_times, preferred_channel, touchpoints, status, messages_sent, last_message_sent_at, converted, created_at, registrants(full_name, email)"
    )
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ sequences: sequences ?? [] });
}

const generateSchema = z.object({ webinarId: z.string().uuid() });

/** Builds proposals for every lead who doesn't have one yet. Nothing is sent until a host activates it. */
export async function POST(request: Request) {
  const parsed = generateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "webinarId is required" }, { status: 422 });
  const { webinarId } = parsed.data;

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data: webinar } = await supabase.from("webinars").select("title").eq("id", webinarId).maybeSingle();
  if (!webinar) return NextResponse.json({ error: "Webinar not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("predictive_nurture_sequences")
    .select("registrant_id")
    .eq("webinar_id", webinarId);
  const covered = new Set((existing ?? []).map((row) => row.registrant_id));

  const { data: registrants } = await supabase
    .from("registrants")
    .select("id")
    .eq("webinar_id", webinarId)
    .eq("bought", false)
    .limit(MAX_PROPOSALS_PER_RUN * 3);

  const targets = (registrants ?? []).filter((row) => !covered.has(row.id)).slice(0, MAX_PROPOSALS_PER_RUN);

  let created = 0;
  for (const registrant of targets) {
    const prediction = await predictForRegistrant({
      registrantId: registrant.id,
      webinarId,
      webinarTitle: webinar.title,
      replayLink: `${SITE.url}/webinar/${webinarId}/register`,
    });
    if (!prediction) continue;

    const { error } = await supabase.from("predictive_nurture_sequences").insert({
      webinar_id: webinarId,
      registrant_id: registrant.id,
      sequence_type: prediction.tier,
      predicted_conversion_date: prediction.predictedConversionDate,
      optimal_contact_times: prediction.optimalHours as unknown as Json,
      preferred_channel: prediction.preferredChannel,
      touchpoints: prediction.touchpoints as unknown as Json,
      status: "proposed",
    });
    if (!error) created += 1;
  }

  return NextResponse.json({ created, skipped: targets.length - created });
}

const patchSchema = z.object({
  webinarId: z.string().uuid(),
  /** Omit to act on every proposed sequence for this webinar. */
  id: z.string().uuid().optional(),
  status: z.enum(["proposed", "active", "paused", "completed"]),
});

export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const { webinarId, id, status } = parsed.data;

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  let query = supabase.from("predictive_nurture_sequences").update({ status }).eq("webinar_id", webinarId);
  if (id) query = query.eq("id", id);
  else query = query.eq("status", "proposed");

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
