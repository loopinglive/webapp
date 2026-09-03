import { NextResponse } from "next/server";

import { LIMITS, clientIp, rateLimit, tooManyRequests } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_LENGTH = 500;

/*
 * How fast one room may move.
 *
 * Per-IP limits catch a script. They do not catch the shape of a busy room:
 * a thousand people typing is legitimate traffic that still has to be shaped,
 * because Supabase Realtime broadcasts every insert to every subscriber, so
 * message rate multiplies by audience size on the way out.
 *
 * The ceiling is on the room rather than the person, and a room at the
 * ceiling drops the newest message rather than queueing it — a chat that
 * lags thirty seconds behind the video is worse than one that is slightly
 * incomplete, because the lag is visible and the gap is not.
 *
 * Approximate by construction: the counter lives in the process, and there
 * may be several. The number that matters is the order of magnitude.
 */
const SESSION_LIMIT = { limit: 240, windowSeconds: 60 };

/** One person, so a single attendee cannot fill the room on their own. */
const PERSON_LIMIT = { limit: 8, windowSeconds: 60 };

// Chat history for a viewer joining mid-session.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  await params;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  // Cursor for the polling fallback: everything after this timestamp, rather
  // than re-fetching three hundred rows every five seconds.
  const since = url.searchParams.get("since");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  let query = supabase
    .from("live_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("sent_at", { ascending: true })
    .limit(300);

  // Greater-or-equal, not greater-than: two messages can share a timestamp,
  // and the client de-duplicates by id anyway. Missing one is worse than
  // sending one twice.
  if (since) query = query.gte("sent_at", since);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

// A real attendee speaking. The display name comes from their registrant row,
// never from the request body, so nobody can post under someone else's name.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const { sessionId, registrantId, content } = (await request.json()) as {
    sessionId?: string;
    registrantId?: string;
    content?: string;
  };

  const body = content?.trim();

  if (!sessionId || !registrantId || !body) {
    return NextResponse.json({ error: "Missing message details" }, { status: 400 });
  }
  if (body.length > MAX_LENGTH) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  // Three ceilings, narrowest first, so the message a person sees is about
  // them rather than about the room.
  const person = rateLimit(`chat:person:${registrantId}`, PERSON_LIMIT);
  if (!person.ok) {
    return NextResponse.json(
      { error: "You are sending messages very quickly. Give it a moment." },
      { status: 429, headers: { "Retry-After": String(person.retryAfter) } }
    );
  }

  const ip = rateLimit(`chat:ip:${clientIp(request)}`, LIMITS.chat);
  if (!ip.ok) return tooManyRequests(ip);

  const room = rateLimit(`chat:session:${sessionId}`, SESSION_LIMIT);
  if (!room.ok) {
    return NextResponse.json(
      { error: "The chat is moving fast right now. Try again in a moment." },
      { status: 429, headers: { "Retry-After": String(room.retryAfter) } }
    );
  }

  const supabase = createServiceClient();

  const { data: registrant } = await supabase
    .from("registrants")
    .select("id, full_name, country_flag, webinar_id")
    .eq("id", registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!registrant) {
    return NextResponse.json({ error: "Register before chatting." }, { status: 403 });
  }

  /*
   * The same message twice in a row.
   *
   * Almost always a double-tap on a slow connection rather than intent, and
   * the duplicate is the one thing in the room that reads as broken software
   * rather than as a live audience.
   */
  const { data: last } = await supabase
    .from("live_chat_messages")
    .select("content, sent_at")
    .eq("session_id", sessionId)
    .eq("registrant_id", registrant.id)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    last?.content === body &&
    Date.now() - new Date(last.sent_at).getTime() < 20_000
  ) {
    // Reported as success: they said it, it is on screen, and an error here
    // would be a confusing answer to a question they did not ask.
    return NextResponse.json({ message: null, duplicate: true });
  }

  const { data, error } = await supabase
    .from("live_chat_messages")
    .insert({
      session_id: sessionId,
      sender_name: registrant.full_name,
      // Deliberately no flag or badge: rule 4 — a real attendee's message has to
      // be visually identical to a persona's.
      sender_avatar: null,
      is_real_user: true,
      is_fake: false,
      registrant_id: registrant.id,
      content: body,
      sent_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
