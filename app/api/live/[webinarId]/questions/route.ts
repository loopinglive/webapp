import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const askSchema = z.object({
  registrantId: z.string().uuid(),
  question: z.string().min(3).max(500).trim(),
});

/** Everyone reads the queue; dismissed questions are the host's business. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: live } = await supabase
    .from("live_sessions")
    .select("id")
    .eq("webinar_id", webinarId)
    .in("status", ["backstage", "live", "ended", "processing", "converted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!live) return NextResponse.json({ questions: [] });

  // The host sees everything, including dismissed; attendees do not.
  const { user } = await requireAdmin();

  let query = supabase
    .from("live_questions")
    .select("*")
    .eq("live_session_id", live.id)
    .order("is_featured", { ascending: false })
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: true });

  if (!user) query = query.neq("status", "dismissed");

  const { data } = await query;
  return NextResponse.json({ liveSessionId: live.id, questions: data ?? [] });
}

/** An attendee asks. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  // Q&A is a public write, so it needs the same protection as chat.
  const limit = rateLimit(`qa:${clientIp(request)}`, { limit: 5, windowSeconds: 60 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Slow down a moment — try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const { webinarId } = await params;
  const parsed = askSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Write a question first." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: live } = await supabase
    .from("live_sessions")
    .select("id, session_id")
    .eq("webinar_id", webinarId)
    .eq("status", "live")
    .maybeSingle();

  if (!live) {
    return NextResponse.json({ error: "Nothing is live right now." }, { status: 400 });
  }

  const { data: registrant } = await supabase
    .from("registrants")
    .select("id, full_name")
    .eq("id", parsed.data.registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!registrant) {
    return NextResponse.json({ error: "Register to ask a question." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("live_questions")
    .insert({
      live_session_id: live.id,
      session_id: live.session_id,
      registrant_id: registrant.id,
      // First name only, matching how chat identifies people.
      author_name: registrant.full_name.split(" ")[0],
      question: parsed.data.question,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data });
}

const patchSchema = z.object({
  questionId: z.string().uuid(),
  action: z.enum(["answer", "feature", "unfeature", "dismiss", "reopen", "upvote"]),
  registrantId: z.string().uuid().optional(),
});

/** Host moderation, plus attendee upvotes. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { questionId, action, registrantId } = parsed.data;

  // Upvoting is the one action an attendee may take. The primary key on
  // (question_id, registrant_id) makes it one vote per person, and the
  // trigger keeps the count honest.
  if (action === "upvote") {
    if (!registrantId) {
      return NextResponse.json({ error: "Register to vote." }, { status: 403 });
    }

    const { error } = await supabase
      .from("live_question_votes")
      .insert({ question_id: questionId, registrant_id: registrantId });

    // A duplicate vote is a no-op, not an error worth showing.
    if (error && !error.message.includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { data: live } = await supabase
    .from("live_sessions")
    .select("id, started_at")
    .eq("webinar_id", webinarId)
    .in("status", ["live", "ended", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // The offset is what makes an answered question usable in the replay —
  // "the host answered this at 24:10".
  const offset = live?.started_at
    ? Math.max(0, Math.round((Date.now() - new Date(live.started_at).getTime()) / 1000))
    : null;

  const patch =
    action === "answer"
      ? { status: "answered", answered_at: new Date().toISOString(), video_offset_seconds: offset }
      : action === "feature"
        ? { is_featured: true }
        : action === "unfeature"
          ? { is_featured: false }
          : action === "dismiss"
            ? { status: "dismissed", is_featured: false }
            : { status: "pending", answered_at: null };

  // Only one featured question at a time: two banners is no banner.
  if (action === "feature" && live) {
    await supabase
      .from("live_questions")
      .update({ is_featured: false })
      .eq("live_session_id", live.id)
      .eq("is_featured", true);
  }

  const { data, error } = await supabase
    .from("live_questions")
    .update(patch)
    .eq("id", questionId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data });
}
