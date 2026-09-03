import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { recordingUrl } from "@/lib/live/livekit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Turns a finished broadcast into an automated webinar.
 *
 * This is the point of the whole phase. A host who went live once has already
 * produced the perfect chat script for the replay — they wrote it by accident,
 * in real time, with real people. Carrying that across at the offsets it
 * originally happened is what makes the replay feel like the live session
 * rather than an imitation of one.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { liveSessionId, overwriteVideo } = (await request
    .json()
    .catch(() => ({}))) as { liveSessionId?: string; overwriteVideo?: boolean };

  const supabase = createServiceClient();

  const { data: live } = liveSessionId
    ? await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", liveSessionId)
        .eq("webinar_id", webinarId)
        .maybeSingle()
    : await supabase
        .from("live_sessions")
        .select("*")
        .eq("webinar_id", webinarId)
        .in("status", ["ended", "processing", "converted"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (!live) {
    return NextResponse.json({ error: "No finished broadcast found." }, { status: 404 });
  }

  // Resolve the recording if egress has finished since the session ended.
  let videoUrl = live.recording_url;
  if (!videoUrl && live.egress_id) {
    try {
      videoUrl = await recordingUrl(live.egress_id);
      if (videoUrl) {
        await supabase
          .from("live_sessions")
          .update({ recording_url: videoUrl, status: "ended" })
          .eq("id", live.id);
      }
    } catch {
      /* still processing */
    }
  }

  if (!videoUrl) {
    return NextResponse.json(
      {
        error: live.recording_error
          ? `This session was not recorded: ${live.recording_error}`
          : "The recording is still processing. Try again shortly.",
        stillProcessing: !live.recording_error,
      },
      { status: 409 }
    );
  }

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, video_url, title")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "No such webinar." }, { status: 404 });
  }

  // Never overwrite silently — a host with an existing video should be asked.
  if (webinar.video_url && !overwriteVideo) {
    return NextResponse.json(
      {
        error: "This webinar already has a video.",
        needsConfirmation: true,
        currentVideo: webinar.video_url,
      },
      { status: 409 }
    );
  }

  const startedAt = live.started_at ? new Date(live.started_at).getTime() : null;
  const duration = live.duration_seconds ?? 0;

  await supabase
    .from("webinars")
    .update({
      video_url: videoUrl,
      video_public_id: live.recording_public_id,
      video_duration_seconds: duration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", webinarId);

  // ── The real conversation becomes the simulated one ──
  let commentsCreated = 0;

  if (startedAt && live.session_id) {
    const { data: messages } = await supabase
      .from("live_chat_messages")
      .select("sender_name, content, sent_at, is_fake, is_real_user")
      .eq("session_id", live.session_id)
      .order("sent_at", { ascending: true });

    // Only real attendees. Fake persona comments already exist as timed
    // comments; copying them back would double every one of them.
    const real = (messages ?? []).filter((m) => m.is_real_user && !m.is_fake);

    if (real.length > 0) {
      // Timed comments need a persona to speak as. Reuse existing ones where
      // the name matches so a returning attendee keeps their identity.
      const { data: personas } = await supabase
        .from("fake_personas")
        .select("id, name")
        .eq("webinar_id", webinarId);

      const personaByName = new Map(
        (personas ?? []).map((p) => [p.name.toLowerCase(), p.id])
      );

      const missing = [
        ...new Set(
          real
            .map((m) => m.sender_name)
            .filter((name) => !personaByName.has(name.toLowerCase()))
        ),
      ];

      if (missing.length > 0) {
        const { data: created } = await supabase
          .from("fake_personas")
          .insert(missing.map((name) => ({ webinar_id: webinarId, name })))
          .select("id, name");

        for (const persona of created ?? []) {
          personaByName.set(persona.name.toLowerCase(), persona.id);
        }
      }

      const comments = real
        .map((message) => {
          const personaId = personaByName.get(message.sender_name.toLowerCase());
          if (!personaId) return null;

          const offset = Math.max(
            0,
            Math.round((new Date(message.sent_at).getTime() - startedAt) / 1000)
          );
          // A message sent after the broadcast ended has no place on the
          // video's timeline.
          if (duration && offset > duration) return null;

          return {
            webinar_id: webinarId,
            persona_id: personaId,
            content: message.content,
            video_offset_seconds: offset,
          };
        })
        .filter(Boolean) as {
        webinar_id: string;
        persona_id: string;
        content: string;
        video_offset_seconds: number;
      }[];

      if (comments.length > 0) {
        const { error } = await supabase.from("timed_comments").insert(comments);
        if (!error) commentsCreated = comments.length;
      }
    }

    // Answered questions become comments too, at the moment they were answered.
    const { data: answered } = await supabase
      .from("live_questions")
      .select("author_name, question, video_offset_seconds")
      .eq("live_session_id", live.id)
      .eq("status", "answered")
      .not("video_offset_seconds", "is", null);

    if (answered?.length) {
      const { data: personas } = await supabase
        .from("fake_personas")
        .select("id, name")
        .eq("webinar_id", webinarId);

      const byName = new Map((personas ?? []).map((p) => [p.name.toLowerCase(), p.id]));

      const questionComments = answered
        .map((row) => {
          const personaId = byName.get(row.author_name.toLowerCase());
          if (!personaId || row.video_offset_seconds === null) return null;
          return {
            webinar_id: webinarId,
            persona_id: personaId,
            content: row.question,
            // Slightly before the answer, so the question reads as leading
            // into it rather than landing on top of it.
            video_offset_seconds: Math.max(0, row.video_offset_seconds - 15),
          };
        })
        .filter(Boolean) as {
        webinar_id: string;
        persona_id: string;
        content: string;
        video_offset_seconds: number;
      }[];

      if (questionComments.length > 0) {
        await supabase.from("timed_comments").insert(questionComments);
        commentsCreated += questionComments.length;
      }
    }
  }

  await supabase
    .from("live_sessions")
    .update({
      status: "converted",
      converted_webinar_id: webinarId,
      converted_at: new Date().toISOString(),
    })
    .eq("id", live.id);

  return NextResponse.json({
    success: true,
    videoUrl,
    durationSeconds: duration,
    commentsCreated,
  });
}
