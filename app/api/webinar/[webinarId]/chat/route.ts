import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_LENGTH = 500;

// Chat history for a viewer joining mid-session.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("live_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("sent_at", { ascending: true })
    .limit(300);

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
