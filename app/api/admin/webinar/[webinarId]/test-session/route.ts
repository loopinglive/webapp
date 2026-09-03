import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Long enough for the room to load and the countdown to resolve. */
const LEAD_SECONDS = 6;

/**
 * Starts a run of this webinar that does not count.
 *
 * The alternative — a preview mode that fakes a session and suppresses every
 * write — puts a branch in every path in the room, including the ones the host
 * opened the preview to check. So this is a real session, with a real
 * registrant, and everything behaves exactly as it will on the night: chat
 * persists, personas post, the offer appears at its offset.
 *
 * Both rows are marked, and the two places where that would do harm skip them:
 * analytics never counts a test run, and no automated message is ever
 * scheduled for one.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { user, response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, owner_id, video_url, video_duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  // A webinar with no video has nothing to preview, and the room would sit on
  // a spinner rather than say so.
  if (!webinar.video_url) {
    return NextResponse.json(
      { error: "Upload the video first — there is nothing to watch yet." },
      { status: 400 }
    );
  }

  const duration = webinar.video_duration_seconds ?? 0;
  const startsAt = new Date(Date.now() + LEAD_SECONDS * 1000);
  const endsAt = new Date(startsAt.getTime() + duration * 1000);

  const { data: session, error: sessionError } = await supabase
    .from("webinar_sessions")
    .insert({
      webinar_id: webinarId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "scheduled",
      is_test: true,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: sessionError?.message ?? "Could not start a test run." },
      { status: 500 }
    );
  }

  // The host attends as themselves. A registrant is what the room needs in
  // order to have someone to be — without one, chat is read-only and the offer
  // has nobody to assign a variant to, which is most of what they came to see.
  const { data: registrant, error: registrantError } = await supabase
    .from("registrants")
    .insert({
      webinar_id: webinarId,
      session_id: session.id,
      full_name: user.user_metadata?.full_name || "You (preview)",
      email: user.email ?? "preview@loopinglive.com",
      phone: "",
      country_code: "",
      country_flag: "",
      is_test: true,
    })
    .select("id, full_name")
    .single();

  if (registrantError || !registrant) {
    // Leaving an orphan session behind would put a run nobody can watch on the
    // schedule screen.
    await supabase.from("webinar_sessions").delete().eq("id", session.id);
    return NextResponse.json(
      { error: registrantError?.message ?? "Could not start a test run." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    registrant: { id: registrant.id, fullName: registrant.full_name },
    startsAt: startsAt.toISOString(),
    watchUrl: `/webinar/${webinarId}/watch?test=${session.id}`,
  });
}

/** Ends a test run early and clears it away. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Scoped to both the webinar and the test flag, so this can never delete a
  // real session by id.
  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("webinar_id", webinarId)
    .eq("is_test", true)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "No such test run." }, { status: 404 });
  }

  await supabase.from("registrants").delete().eq("session_id", sessionId).eq("is_test", true);
  await supabase.from("webinar_sessions").delete().eq("id", sessionId);

  return NextResponse.json({ success: true });
}
