import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAnyAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET ?sessionId=&registrantId= returns one thread (used by both the
 * attendee widget and the host, since both are just reading the same rows).
 * GET ?sessionId= alone (admin only) lists every thread for that session,
 * one row per registrant with their latest message and an unread count.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  await params;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const registrantId = url.searchParams.get("registrantId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (registrantId) {
    const { data, error } = await supabase
      .from("private_messages")
      .select("id, sender_type, content, sent_at, is_read")
      .eq("session_id", sessionId)
      .eq("registrant_id", registrantId)
      .order("sent_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
  }

  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const { data, error } = await supabase
    .from("private_messages")
    .select("id, registrant_id, sender_type, content, sent_at, is_read, registrants(full_name, email)")
    .eq("session_id", sessionId)
    .order("sent_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const threads = new Map<
    string,
    { registrantId: string; name: string; lastMessage: string; lastSentAt: string; unread: number }
  >();

  for (const row of data ?? []) {
    const registrant = Array.isArray(row.registrants) ? row.registrants[0] : row.registrants;
    const existing = threads.get(row.registrant_id);
    if (!existing) {
      threads.set(row.registrant_id, {
        registrantId: row.registrant_id,
        name: registrant?.full_name ?? registrant?.email ?? "Attendee",
        lastMessage: row.content,
        lastSentAt: row.sent_at,
        unread: row.sender_type === "attendee" && !row.is_read ? 1 : 0,
      });
    } else if (row.sender_type === "attendee" && !row.is_read) {
      existing.unread += 1;
    }
  }

  return NextResponse.json({ threads: [...threads.values()] });
}

const postSchema = z.object({
  sessionId: z.string().uuid(),
  registrantId: z.string().uuid(),
  senderType: z.enum(["attendee", "host"]),
  content: z.string().min(1).max(2000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  await params;
  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  // A host reply needs to be an admin; an attendee can only ever speak as
  // themselves, so there is nothing further to check on that branch.
  if (parsed.data.senderType === "host") {
    const { response: denied } = await requireAnyAdmin();
    if (denied) return denied;
  }

  const { error } = await createServiceClient().from("private_messages").insert({
    session_id: parsed.data.sessionId,
    registrant_id: parsed.data.registrantId,
    sender_type: parsed.data.senderType,
    content: parsed.data.content,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Read receipts flip the other direction: a host viewing marks attendee
  // messages read; an attendee arriving marks host messages read.
  await createServiceClient()
    .from("private_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("session_id", parsed.data.sessionId)
    .eq("registrant_id", parsed.data.registrantId)
    .eq("sender_type", parsed.data.senderType === "host" ? "attendee" : "host")
    .eq("is_read", false);

  return NextResponse.json({ ok: true });
}
