import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { generatePersonaProfiles } from "@/lib/anthropic";
import { PRESET_AVATARS } from "@/lib/preset-avatars";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  count: z.number().int().min(1).max(20).default(6),
  brief: z.string().max(500).optional(),
});

/**
 * Generates a batch of believable chat personas with Claude and inserts them
 * straight into fake_personas — the same table the manual "New persona" form
 * and CSV import write to, so nothing downstream needs to know these were
 * AI-generated. A row in ai_generated_personas keeps an audit trail of the
 * generation itself (prompt, count, niche) without duplicating persona data.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, topic")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) return NextResponse.json({ error: "Webinar not found" }, { status: 404 });

  const profiles = await generatePersonaProfiles({
    webinarTitle: webinar.title,
    webinarTopic: webinar.topic ?? "",
    count: parsed.data.count,
    brief: parsed.data.brief,
  });

  if (!profiles.length) {
    return NextResponse.json({ error: "The model did not return any personas. Try again." }, { status: 502 });
  }

  const rows = profiles.map((profile, index) => ({
    webinar_id: webinarId,
    name: profile.name,
    location: profile.location,
    avatar_url: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
    _brief: profile.personalityBrief, // not persisted — see ai_generated_personas insert below
    _index: index,
  }));

  const { data: inserted, error } = await supabase
    .from("fake_personas")
    .insert(rows.map(({ webinar_id, name, location, avatar_url }) => ({ webinar_id, name, location, avatar_url })))
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("ai_generated_personas").insert({
    webinar_id: webinarId,
    generation_prompt: parsed.data.brief ?? null,
    generated_count: inserted?.length ?? 0,
    niche: webinar.topic ?? null,
    locations: profiles.map((profile) => profile.location),
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  return NextResponse.json({ personas: inserted ?? [] });
}
