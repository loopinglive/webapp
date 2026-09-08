import { NextResponse } from "next/server";

import { generateWebinarScript } from "@/lib/anthropic";
import { logStep, markFailed, triggerNextStep, verifyPipelineSecret } from "@/lib/autonomous/pipeline";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!verifyPipelineSecret(request)) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const { autonomousWebinarId } = (await request.json().catch(() => ({}))) as { autonomousWebinarId?: string };
  if (!autonomousWebinarId) return NextResponse.json({ error: "autonomousWebinarId is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: job } = await supabase
    .from("autonomous_webinars")
    .select("id, webinar_id, topic, target_audience, offer_description, config")
    .eq("id", autonomousWebinarId)
    .maybeSingle();

  if (!job || !job.webinar_id) {
    return NextResponse.json({ error: "Generation job not found." }, { status: 404 });
  }

  const config = job.config as { price?: string; lengthMinutes?: number; tone?: string };

  await logStep(autonomousWebinarId, "script", "running");

  try {
    const sections = await generateWebinarScript({
      topic: job.topic,
      targetAudience: job.target_audience,
      offer: job.offer_description,
      price: config.price || "the listed price",
      tone: (config.tone ?? "conversational").replace("_", " "),
      lengthMinutes: config.lengthMinutes ?? 60,
    });

    if (sections.length === 0 || sections.every((section) => !section.content.trim())) {
      throw new Error("The model returned an empty script.");
    }

    const { data: webinar } = await supabase.from("webinars").select("owner_id").eq("id", job.webinar_id).maybeSingle();
    if (!webinar?.owner_id) throw new Error("The generation job's webinar has no owner.");

    const { data: script, error } = await supabase
      .from("webinar_scripts")
      .insert({
        user_id: webinar.owner_id,
        webinar_id: job.webinar_id,
        title: job.topic.slice(0, 160),
        topic: job.topic,
        target_audience: job.target_audience,
        offer_description: job.offer_description,
        webinar_length_minutes: config.lengthMinutes ?? 60,
        script_content: { sections } as unknown as Json,
        status: "final",
      })
      .select("id")
      .single();

    if (error || !script) throw new Error(error?.message ?? "Could not save the script.");

    await supabase.from("webinars").update({ script_id: script.id }).eq("id", job.webinar_id);

    await logStep(autonomousWebinarId, "script", "complete");
    triggerNextStep("/api/autonomous/presentation", { autonomousWebinarId });
    return NextResponse.json({ success: true, scriptId: script.id });
  } catch (error) {
    await markFailed(autonomousWebinarId, "script", error instanceof Error ? error.message : "Script generation failed.");
    return NextResponse.json({ error: "Script generation failed." }, { status: 500 });
  }
}
