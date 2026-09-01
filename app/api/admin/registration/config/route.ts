import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

/** Only these are writable from the builder; anything else in the body is ignored. */
const FIELDS = [
  "logo_url",
  "hero_image_url",
  "background_type",
  "background_value",
  "primary_colour",
  "secondary_colour",
  "headline",
  "subheadline",
  "host_name",
  "host_title",
  "host_avatar_url",
  "what_you_will_learn",
  "social_proof_count",
  "social_proof_label",
  "show_attendee_count",
  "show_session_time",
  "cta_button_text",
  "thank_you_headline",
  "thank_you_subheadline",
  "thank_you_redirect_url",
  "show_add_to_calendar",
  "show_social_share",
  "custom_fields",
  "facebook_pixel_id",
  "fb_track_pageview",
  "fb_track_lead",
  "google_analytics_id",
  "ga_track_conversion",
  "custom_css",
  "is_active",
] as const;

export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data } = await supabase
    .from("registration_page_config")
    .select("*")
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (data) return NextResponse.json({ config: data });

  // First visit: create the row from the webinar's own details so the builder
  // opens on something recognisable rather than lorem defaults.
  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, description")
    .eq("id", webinarId)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("registration_page_config")
    .insert({
      webinar_id: webinarId,
      headline: webinar?.title ?? "Join Our Live Webinar",
      subheadline: webinar?.description ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: created });
}

export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const body = (await request.json()) as Record<string, unknown> & {
    webinarId?: string;
  };

  if (!body.webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    webinar_id: body.webinarId,
    updated_at: new Date().toISOString(),
  };

  for (const field of FIELDS) {
    if (field in body) patch[field] = body[field] as Json;
  }

  if (typeof patch.headline === "string" && !patch.headline.trim()) {
    return NextResponse.json(
      { error: "The headline cannot be empty." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("registration_page_config")
    .upsert(patch as never, { onConflict: "webinar_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, config: data });
}
