import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { generateWebinarScript } from "@/lib/anthropic";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().max(160).trim().optional(),
  topic: z.string().min(3).max(300).trim(),
  targetAudience: z.string().max(300).trim().optional(),
  offer: z.string().max(300).trim().optional(),
  price: z.string().max(60).trim().optional(),
  tone: z
    .enum(["conversational", "professional", "high_energy", "educational"])
    .default("conversational"),
  lengthMinutes: z.number().int().min(15).max(120).default(60),
});

/**
 * Generates a full script and saves it as a draft.
 *
 * Written and stored in one step rather than returned for review first, the
 * way the timed-comment generator works — a script is the thing a host edits
 * for a while before it is useful, and ScriptEditor is where that editing
 * happens. Nothing here is applied to a webinar until /apply is called.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured on this deployment." },
      { status: 503 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "A topic is required." }, { status: 422 });
  }

  const sections = await generateWebinarScript({
    topic: parsed.data.topic,
    targetAudience: parsed.data.targetAudience || "a general audience",
    offer: parsed.data.offer || "the offer",
    price: parsed.data.price || "the listed price",
    tone: parsed.data.tone.replace("_", " "),
    lengthMinutes: parsed.data.lengthMinutes,
  });

  if (sections.length === 0) {
    return NextResponse.json(
      { error: "Could not generate a script. Try again." },
      { status: 502 }
    );
  }

  const supabase = createServiceClient();

  const { data: script, error } = await supabase
    .from("webinar_scripts")
    .insert({
      user_id: account.id,
      title: parsed.data.title || parsed.data.topic.slice(0, 160),
      topic: parsed.data.topic,
      target_audience: parsed.data.targetAudience || null,
      offer_description: parsed.data.offer || null,
      webinar_length_minutes: parsed.data.lengthMinutes,
      script_content: { sections } as unknown as Json,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ script });
}
