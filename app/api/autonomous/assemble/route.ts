import { NextResponse } from "next/server";

import { generatePersonaProfiles, generateTimedComments, type ScriptSection } from "@/lib/anthropic";
import { logStep, markFailed, verifyPipelineSecret } from "@/lib/autonomous/pipeline";
import { assembleVideo } from "@/lib/autonomous/video";
import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { sendEmail } from "@/lib/messaging/providers";
import { PRESET_AVATARS } from "@/lib/preset-avatars";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type UploadedSlide = { sectionKey: string; title: string; bullets: string[]; publicId: string; url: string; durationSeconds?: number };

/**
 * Video assembly, then — because both are quick (a few minutes each, per
 * the build spec) — persona generation and automation configuration too,
 * finishing with the "ready to review" email. Kept in one route rather than
 * three more self-chained ones: nothing here needs its own multi-minute
 * budget the way script/presentation/voice generation do.
 */
export async function POST(request: Request) {
  if (!verifyPipelineSecret(request)) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const { autonomousWebinarId } = (await request.json().catch(() => ({}))) as { autonomousWebinarId?: string };
  if (!autonomousWebinarId) return NextResponse.json({ error: "autonomousWebinarId is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: job } = await supabase
    .from("autonomous_webinars")
    .select("id, webinar_id, user_id, topic, niche, offer_description, config")
    .eq("id", autonomousWebinarId)
    .maybeSingle();

  if (!job || !job.webinar_id) return NextResponse.json({ error: "Generation job not found." }, { status: 404 });
  const webinarId = job.webinar_id;

  await logStep(autonomousWebinarId, "video", "running");

  try {
    const config = job.config as { narrationClipPublicIds?: string[]; theme?: string };
    if (!config.narrationClipPublicIds?.length) throw new Error("No narration clips to assemble.");

    const { data: presentation } = await supabase
      .from("ai_presentations")
      .select("id, slides")
      .eq("webinar_id", webinarId)
      .maybeSingle();

    const slides = ((presentation?.slides as UploadedSlide[] | null) ?? []).filter((slide) => slide.publicId);
    if (slides.length === 0) throw new Error("No slides to assemble.");

    const videoUrl = await assembleVideo({
      autonomousWebinarId,
      narrationClipPublicIds: config.narrationClipPublicIds,
      slides: slides.map((slide) => ({ publicId: slide.publicId, durationSeconds: slide.durationSeconds ?? 15 })),
    });

    const totalDuration = slides.reduce((sum, slide) => sum + (slide.durationSeconds ?? 15), 0);

    await supabase
      .from("webinars")
      .update({ video_url: videoUrl, video_duration_seconds: totalDuration })
      .eq("id", webinarId);

    if (presentation) {
      await supabase.from("ai_presentations").update({ status: "complete", video_url: videoUrl }).eq("id", presentation.id);
    }

    await logStep(autonomousWebinarId, "video", "complete");

    // ─── Personas ───────────────────────────────────────────────────────
    await logStep(autonomousWebinarId, "personas", "running");

    const { data: webinar } = await supabase.from("webinars").select("title, topic, script_id, owner_id").eq("id", webinarId).maybeSingle();
    const { data: scriptRow } = await supabase
      .from("webinar_scripts")
      .select("script_content")
      .eq("id", webinar?.script_id ?? "")
      .maybeSingle();
    const sections = ((scriptRow?.script_content as { sections?: ScriptSection[] } | null)?.sections ?? []) as ScriptSection[];

    const profiles = await generatePersonaProfiles({
      webinarTitle: webinar?.title ?? job.topic,
      webinarTopic: webinar?.topic ?? job.topic,
      count: 20,
      brief: `Niche: ${job.niche}`,
    });

    let personaCount = 0;
    let commentCount = 0;

    if (profiles.length > 0) {
      const { data: insertedPersonas } = await supabase
        .from("fake_personas")
        .insert(
          profiles.map((profile) => ({
            webinar_id: webinarId,
            name: profile.name,
            location: profile.location,
            avatar_url: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
          }))
        )
        .select("id");

      personaCount = insertedPersonas?.length ?? 0;

      await supabase.from("ai_generated_personas").insert({
        webinar_id: webinarId,
        generation_prompt: `Autonomous generation — niche: ${job.niche}`,
        generated_count: personaCount,
        niche: job.niche,
        locations: profiles.map((profile) => profile.location),
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      if (insertedPersonas?.length && sections.length > 0) {
        // Bucket the script into rough time windows using the same
        // cumulative durations the slides were timed to, so comments land
        // on the moment in the video they're reacting to.
        let cursor = slides[0]?.durationSeconds ?? 5;
        const transcript = sections.map((section, index) => {
          const start = cursor;
          cursor += slides[index + 1]?.durationSeconds ?? 20;
          return { start: Math.round(start), text: section.content.slice(0, 800) };
        });

        const comments = await generateTimedComments({
          transcript,
          personas: insertedPersonas.map((persona) => ({ id: persona.id, name: "" })),
          webinarTitle: webinar?.title ?? job.topic,
          webinarTopic: webinar?.topic ?? job.topic,
          durationSeconds: totalDuration,
          count: Math.min(80, insertedPersonas.length * 4),
        });

        if (comments.length > 0) {
          const { data: insertedComments } = await supabase
            .from("timed_comments")
            .insert(
              comments.map((comment) => ({
                webinar_id: webinarId,
                persona_id: comment.personaId,
                content: comment.content,
                video_offset_seconds: comment.offsetSeconds,
              }))
            )
            .select("id");
          commentCount = insertedComments?.length ?? 0;
        }
      }
    }

    await logStep(autonomousWebinarId, "personas", "complete", `${personaCount} personas, ${commentCount} comments`);

    // ─── Automation ─────────────────────────────────────────────────────
    await logStep(autonomousWebinarId, "automation", "running");

    await supabase.from("automation_settings").upsert(
      {
        webinar_id: webinarId,
        email_enabled: true,
        sms_enabled: false,
        whatsapp_enabled: false,
        replay_enabled: true,
        replay_duration_hours: 48,
        re_engagement_enabled: true,
        from_name: SITE.name,
        from_email: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
      },
      { onConflict: "webinar_id" }
    );

    // Offer button at 85% through the video — after the case studies and
    // offer-reveal sections a generated script always includes near the end.
    // Rendered as the host's own internal offer page (no checkout provider
    // configured for an autonomously generated offer), same as a manually
    // built webinar with no Stripe account connected yet.
    // config.price is free text from the builder form ("$497", "497", "" for
    // "not decided yet") — pull out the first number rather than assuming a shape.
    const priceText = (job.config as { price?: string }).price ?? "";
    const priceMatch = priceText.replace(/,/g, "").match(/\d+(\.\d+)?/);
    const priceCents = priceMatch ? Math.round(parseFloat(priceMatch[0]) * 100) : 0;
    await supabase.from("webinar_offers").insert({
      webinar_id: webinarId,
      offer_title: job.topic,
      offer_description: job.offer_description,
      offer_type: "internal",
      internal_page_content: job.offer_description,
      button_text: "Get Started Now",
      price_cents: priceCents,
      trigger_video_offset_seconds: Math.round(totalDuration * 0.85),
      is_active: true,
    });

    // One daily recurring schedule so the webinar has somewhere to run —
    // the host can add more from the standard schedule builder afterward.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);

    await supabase.from("webinar_schedules").insert({
      webinar_id: webinarId,
      scheduled_at: tomorrow.toISOString(),
      timezone: "UTC",
      is_recurring: true,
      recurrence_pattern: "daily",
      recurrence_time: "19:00",
      is_active: true,
    });

    await logStep(autonomousWebinarId, "automation", "complete");

    await supabase
      .from("autonomous_webinars")
      .update({ generation_status: "ready", published_at: null })
      .eq("id", autonomousWebinarId);

    // ─── Notify ─────────────────────────────────────────────────────────
    if (webinar?.owner_id) {
      const { data: account } = await supabase.from("user_accounts").select("email, full_name").eq("id", webinar.owner_id).maybeSingle();
      if (account?.email) {
        try {
          const { subject, html, text } = renderPlatformEmail(
            "autonomous_generation_complete",
            {
              host_name: account.full_name || "there",
              webinar_title: webinar.title,
              persona_count: String(personaCount),
              review_link: `${SITE.url}/autonomous/${webinarId}/status`,
            },
            { brandName: SITE.name }
          );
          await sendEmail({
            to: account.email,
            fromName: SITE.name,
            fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
            subject,
            html,
            text,
          });
        } catch {
          // A missed notification email never fails a finished generation.
        }
      }
    }

    return NextResponse.json({ success: true, videoUrl, personaCount, commentCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assembly failed.";
    // Whichever of video/personas/automation was mid-flight when this threw
    // is the one still logged "running" — mark that one failed specifically
    // rather than a generic top-level failure with no indication of where.
    const supabase2 = createServiceClient();
    const { data: current } = await supabase2.from("autonomous_webinars").select("generation_log").eq("id", autonomousWebinarId).maybeSingle();
    const log = (current?.generation_log as Array<{ step: string; status: string }> | null) ?? [];
    const lastRunning = [...log].reverse().find((entry) => entry.status === "running");
    await markFailed(autonomousWebinarId, (lastRunning?.step as "video" | "personas" | "automation") ?? "video", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
