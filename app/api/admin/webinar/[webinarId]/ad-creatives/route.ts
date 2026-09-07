import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { generateAdCreatives } from "@/lib/anthropic";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLATFORMS = ["facebook", "instagram", "google", "linkedin", "tiktok"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: creatives } = await supabase
    .from("ad_creatives")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ creatives: creatives ?? [] });
}

const schema = z.object({
  platform: z.enum(PLATFORMS),
  targetAudience: z.string().min(1).max(300).trim(),
  count: z.number().int().min(1).max(5).default(3),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("owner_id, title, topic, offer_description, description")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found." }, { status: 404 });
  }

  const generated = await generateAdCreatives({
    webinarTitle: webinar.title,
    topic: webinar.topic || webinar.description || webinar.title,
    targetAudience: parsed.data.targetAudience,
    offer: webinar.offer_description || "Free live webinar registration",
    platform: parsed.data.platform,
    count: parsed.data.count,
  });

  if (generated.length === 0) {
    return NextResponse.json(
      { error: "The model did not return usable ad copy. Try again." },
      { status: 502 }
    );
  }

  const { data: inserted, error } = await supabase
    .from("ad_creatives")
    .insert(
      generated.map((creative) => ({
        webinar_id: webinarId,
        user_id: webinar.owner_id,
        platform: parsed.data.platform,
        format: "feed",
        headline: creative.headline,
        primary_text: creative.primaryText,
        description: creative.description || null,
        call_to_action: creative.callToAction,
        generated_by_ai: true,
        status: "draft",
      }))
    )
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ creatives: inserted ?? [] });
}
