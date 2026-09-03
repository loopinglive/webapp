import { NextResponse } from "next/server";

import { ensureUpcomingSession } from "@/lib/sessions";
import { createServiceClient } from "@/lib/supabase/server";
import type { SessionPayload } from "@/types";

export const dynamic = "force-dynamic";

// The room's clock. Returns the session that is running right now, or the next
// one due, plus how far away it is.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const supabase = createServiceClient();

  /*
   * A host previewing their own webinar names the session explicitly. Without
   * that id nothing here will ever return a test run, so a visitor who happens
   * to load the page during a preview sees the real schedule.
   *
   * The id is enough of a credential: it is a uuid the host was handed, it
   * only reaches a session marked as a test, and the worst outcome is that
   * someone shown the link watches the video early.
   */
  const testSessionId = new URL(request.url).searchParams.get("test");

  const { data: webinar, error: webinarError } = await supabase
    .from("webinars")
    .select("id, title, description, video_url, video_public_id, video_duration_seconds, thumbnail_url, broadcast_label, show_recorded_notice")
    .eq("id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  if (webinarError) {
    return NextResponse.json({ error: webinarError.message }, { status: 500 });
  }
  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  const now = Date.now();
  const duration = (webinar.video_duration_seconds ?? 0) * 1000;

  // A session that started within the runtime is still live; otherwise take the
  // soonest one still to come.
  const upcoming = async () =>
    testSessionId
      ? supabase
          .from("webinar_sessions")
          .select("*")
          .eq("webinar_id", webinarId)
          .eq("id", testSessionId)
          .eq("is_test", true)
          .limit(1)
      : supabase
          .from("webinar_sessions")
          .select("*")
          .eq("webinar_id", webinarId)
          .eq("is_test", false)
          .gte("starts_at", new Date(now - duration).toISOString())
          .order("starts_at", { ascending: true })
          .limit(1);

  const first = await upcoming();
  let sessions = first.data;
  const sessionError = first.error;

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  // Nothing on the books: roll the recurring schedule forward now rather than
  // waiting for the cron. This is what makes "every day at 8PM" actually
  // recur when no scheduler is wired up.
  if (!sessions?.length && !testSessionId) {
    const created = await ensureUpcomingSession(supabase, webinarId);
    if (created) ({ data: sessions } = await upcoming());
  }

  const session = sessions?.[0] ?? null;

  if (!session) {
    const payload: SessionPayload = {
      webinar,
      session: null,
      secondsUntilStart: null,
      state: "unscheduled",
      serverTime: new Date(now).toISOString(),
    };
    return NextResponse.json(payload);
  }

  const startsAt = new Date(session.starts_at).getTime();
  const secondsUntilStart = Math.round((startsAt - now) / 1000);
  const state: SessionPayload["state"] =
    now < startsAt ? "waiting" : now < startsAt + duration ? "live" : "ended";

  const payload: SessionPayload = {
    webinar,
    session,
    secondsUntilStart,
    state,
    serverTime: new Date(now).toISOString(),
  };

  return NextResponse.json(payload);
}
