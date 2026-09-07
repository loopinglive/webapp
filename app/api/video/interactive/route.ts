import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

/**
 * Only "hotspot" and "social_share" are ever stored here — the other two
 * elements the Phase 14 spec describes (chapter preview cards, progress
 * milestone animations) need no admin-configured content: a chapter preview
 * is derived from video_chapters directly, and a milestone fires at fixed
 * 25/50/75/90% marks. Both are computed client-side in the player instead of
 * round-tripping through a database row for a fact that's already known.
 */
const ELEMENT_TYPES = ["hotspot", "social_share"] as const;

export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("interactive_elements")
    .select("*")
    .eq("webinar_id", webinarId)
    .eq("is_active", true)
    .order("video_offset_seconds", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ elements: data ?? [] });
}

const hotspotConfig = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  label: z.string().min(1).max(60),
  link: z.string().url(),
});

const socialShareConfig = z.object({
  message: z.string().min(1).max(160),
});

const createSchema = z.object({
  webinarId: z.string().uuid(),
  elementType: z.enum(ELEMENT_TYPES),
  videoOffsetSeconds: z.number().int().min(0),
  durationSeconds: z.number().int().min(1).max(120).default(30),
  config: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const configCheck =
    parsed.data.elementType === "hotspot"
      ? hotspotConfig.safeParse(parsed.data.config)
      : socialShareConfig.safeParse(parsed.data.config);

  if (!configCheck.success) {
    return NextResponse.json({ error: configCheck.error.issues[0]?.message ?? "Invalid element config" }, { status: 422 });
  }

  const access = await requireWebinarAccess(parsed.data.webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("interactive_elements")
    .insert({
      webinar_id: parsed.data.webinarId,
      element_type: parsed.data.elementType,
      config: configCheck.data,
      video_offset_seconds: parsed.data.videoOffsetSeconds,
      duration_seconds: parsed.data.durationSeconds,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ element: data });
}

export async function DELETE(request: Request) {
  const { elementId, webinarId } = (await request.json().catch(() => ({}))) as {
    elementId?: string;
    webinarId?: string;
  };
  if (!elementId || !webinarId) {
    return NextResponse.json({ error: "elementId and webinarId are required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  await supabase.from("interactive_elements").delete().eq("id", elementId).eq("webinar_id", webinarId);

  return NextResponse.json({ success: true });
}
