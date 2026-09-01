import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("webinar_offers")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ offer: data ?? null });
}

// One offer per webinar in this phase, so this upserts rather than appends.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  const offerTitle = String(body.offerTitle ?? "").trim();
  const offerType: "internal" | "external" =
    body.offerType === "internal" ? "internal" : "external";
  const externalUrl = String(body.externalUrl ?? "").trim();

  const ANIMATIONS = ["pulse", "glow", "slide", "bounce"] as const;
  const animation = ANIMATIONS.includes(
    body.buttonAnimation as (typeof ANIMATIONS)[number]
  )
    ? (body.buttonAnimation as (typeof ANIMATIONS)[number])
    : "pulse";

  if (!offerTitle) {
    return NextResponse.json({ error: "An offer title is required." }, { status: 400 });
  }
  if (offerType === "external" && !externalUrl) {
    return NextResponse.json(
      { error: "An external offer needs a URL." },
      { status: 400 }
    );
  }

  const row = {
    webinar_id: webinarId,
    offer_title: offerTitle,
    offer_description: String(body.offerDescription ?? "").trim() || null,
    button_text: String(body.buttonText ?? "").trim() || "Grab The Offer Now",
    button_colour: String(body.buttonColour ?? "#6C47FF"),
    button_animation: animation,
    trigger_video_offset_seconds: Math.max(
      0,
      Math.round(Number(body.triggerVideoOffsetSeconds ?? 0))
    ),
    countdown_enabled: Boolean(body.countdownEnabled),
    countdown_minutes: Math.max(1, Math.round(Number(body.countdownMinutes ?? 30))),
    opens_in: (body.opensIn === "new_tab" ? "new_tab" : "modal") as
      | "new_tab"
      | "modal",
    offer_type: offerType,
    external_url: offerType === "external" ? externalUrl : null,
    internal_page_content:
      offerType === "internal"
        ? ((body.internalPageContent ?? null) as Json)
        : null,
    is_active: true,
  };

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("webinar_offers")
    .select("id")
    .eq("webinar_id", webinarId)
    .limit(1)
    .maybeSingle();

  const { data, error } = existing
    ? await supabase
        .from("webinar_offers")
        .update(row)
        .eq("id", existing.id)
        .select("*")
        .single()
    : await supabase.from("webinar_offers").insert(row).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ offer: data });
}
