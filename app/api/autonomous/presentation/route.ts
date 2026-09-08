import { NextResponse } from "next/server";

import type { ScriptSection } from "@/lib/anthropic";
import { generateSlideContent, renderSlideImage, type Slide, type SlideTheme } from "@/lib/autonomous/slides";
import { logStep, markFailed, triggerNextStep, verifyPipelineSecret } from "@/lib/autonomous/pipeline";
import { uploadBuffer } from "@/lib/cloudinary";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!verifyPipelineSecret(request)) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const { autonomousWebinarId } = (await request.json().catch(() => ({}))) as { autonomousWebinarId?: string };
  if (!autonomousWebinarId) return NextResponse.json({ error: "autonomousWebinarId is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: job } = await supabase
    .from("autonomous_webinars")
    .select("id, webinar_id, user_id, topic, offer_description, config")
    .eq("id", autonomousWebinarId)
    .maybeSingle();

  if (!job || !job.webinar_id) return NextResponse.json({ error: "Generation job not found." }, { status: 404 });

  await logStep(autonomousWebinarId, "presentation", "running");

  try {
    const { data: webinar } = await supabase.from("webinars").select("script_id").eq("id", job.webinar_id).maybeSingle();
    const { data: scriptRow } = await supabase
      .from("webinar_scripts")
      .select("script_content")
      .eq("id", webinar?.script_id ?? "")
      .maybeSingle();

    const sections = ((scriptRow?.script_content as { sections?: ScriptSection[] } | null)?.sections ?? []) as ScriptSection[];
    if (sections.length === 0) throw new Error("No script sections available to build slides from.");

    const theme = ((job.config as { theme?: string })?.theme ?? "dark_professional") as SlideTheme;
    const slideContent = await generateSlideContent(sections, job.topic, job.offer_description);

    const uploaded: Array<{ sectionKey: string; title: string; bullets: string[]; publicId: string; url: string }> = [];

    for (const slide of slideContent as Slide[]) {
      const png = await renderSlideImage(slide, theme);
      const result = await uploadBuffer(png, { folder: `autonomous/${autonomousWebinarId}/slides`, resourceType: "image" });
      uploaded.push({ sectionKey: slide.sectionKey, title: slide.title, bullets: slide.bullets, publicId: result.publicId, url: result.url });
    }

    const { error } = await supabase.from("ai_presentations").insert({
      webinar_id: job.webinar_id,
      user_id: job.user_id,
      topic: job.topic,
      slide_count: uploaded.length,
      slides: uploaded as unknown as Json,
      theme,
      status: "complete",
    });

    if (error) throw new Error(error.message);

    await logStep(autonomousWebinarId, "presentation", "complete");
    triggerNextStep("/api/autonomous/voice", { autonomousWebinarId });
    return NextResponse.json({ success: true, slideCount: uploaded.length });
  } catch (error) {
    await markFailed(
      autonomousWebinarId,
      "presentation",
      error instanceof Error ? error.message : "Presentation generation failed."
    );
    return NextResponse.json({ error: "Presentation generation failed." }, { status: 500 });
  }
}
