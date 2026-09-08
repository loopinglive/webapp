import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { getUserAccount } from "@/lib/billing/account";
import { triggerNextStep } from "@/lib/autonomous/pipeline";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NICHES = ["Business", "Health", "Relationships", "Finance", "Education", "Tech", "Spirituality", "Other"] as const;
const TONES = ["inspirational", "educational", "direct", "conversational", "high_energy"] as const;
const THEMES = ["dark_professional", "light_corporate", "bold_colourful", "minimal_clean"] as const;

const schema = z.object({
  topic: z.string().min(3).max(300).trim(),
  audience: z.string().min(3).max(300).trim(),
  offer: z.string().min(3).max(300).trim(),
  price: z.string().max(60).trim().default(""),
  niche: z.enum(NICHES),
  lengthMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
  tone: z.enum(TONES),
  voiceId: z.string().max(120).nullable().default(null),
  voiceCloneId: z.string().uuid().nullable().default(null),
  theme: z.enum(THEMES).default("dark_professional"),
});

/**
 * The one thing a host does by hand: fill in five fields. Everything after
 * this route is server-to-server — the pipeline is a chain of separate
 * function invocations (see lib/autonomous/pipeline.ts for why), kicked off
 * here and never awaited by this request.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (account.is_suspended) return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI generation is not configured on this deployment." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const supabase = createServiceClient();

  // Server capacity: at most 3 autonomous generations running at once per account.
  const { count: inFlight } = await supabase
    .from("autonomous_webinars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", account.id)
    .in("generation_status", ["pending", "generating"]);

  if ((inFlight ?? 0) >= 3) {
    return NextResponse.json(
      { error: "You already have 3 webinars generating. Wait for one to finish before starting another." },
      { status: 429 }
    );
  }

  const { data: webinar, error: webinarError } = await supabase
    .from("webinars")
    .insert({
      owner_id: account.id,
      title: parsed.data.topic,
      description: parsed.data.audience,
      topic: parsed.data.topic,
      offer_description: parsed.data.offer,
      status: "draft",
    })
    .select("id")
    .single();

  if (webinarError || !webinar) {
    return NextResponse.json({ error: webinarError?.message ?? "Could not create the webinar." }, { status: 500 });
  }

  const estimatedMinutes = 15 + Math.round(parsed.data.lengthMinutes / 10);

  const { data: autonomous, error: autoError } = await supabase
    .from("autonomous_webinars")
    .insert({
      webinar_id: webinar.id,
      user_id: account.id,
      topic: parsed.data.topic,
      target_audience: parsed.data.audience,
      offer_description: parsed.data.offer,
      niche: parsed.data.niche,
      generation_status: "pending",
      estimated_completion_minutes: estimatedMinutes,
      config: {
        price: parsed.data.price,
        lengthMinutes: parsed.data.lengthMinutes,
        tone: parsed.data.tone,
        voiceId: parsed.data.voiceId,
        voiceCloneId: parsed.data.voiceCloneId,
        theme: parsed.data.theme,
      },
    })
    .select("id")
    .single();

  if (autoError || !autonomous) {
    return NextResponse.json({ error: autoError?.message ?? "Could not start generation." }, { status: 500 });
  }

  triggerNextStep("/api/autonomous/script", { autonomousWebinarId: autonomous.id });

  await logAudit({
    action: "autonomous.generation_started",
    resourceType: "webinar",
    resourceId: webinar.id,
    userId: account.id,
    newValue: { topic: parsed.data.topic, niche: parsed.data.niche },
    request,
  });

  return NextResponse.json({ webinarId: webinar.id, autonomousWebinarId: autonomous.id });
}
