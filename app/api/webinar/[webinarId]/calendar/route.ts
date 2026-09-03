import { buildIcs } from "@/lib/calendar";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The .ics file for a session.
 *
 * Public by design: the link goes in a confirmation email, and requiring a
 * session to download it would break every mail client that fetches links
 * without cookies.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, description, video_duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) return new Response("Not found", { status: 404 });

  const { data: session } = sessionId
    ? await supabase
        .from("webinar_sessions")
        .select("id, starts_at")
        .eq("id", sessionId)
        .maybeSingle()
    : await supabase
        .from("webinar_sessions")
        .select("id, starts_at")
        .eq("webinar_id", webinarId)
        .eq("status", "scheduled")
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();

  if (!session) return new Response("No upcoming session", { status: 404 });

  const joinUrl = `${SITE.url}/webinar/${webinarId}/watch`;

  const ics = buildIcs({
    // Stable per session, so a re-download updates the existing entry rather
    // than creating a second one in the calendar.
    uid: `session-${session.id}@loopinglive.com`,
    title: webinar.title,
    description: [
      webinar.description,
      "",
      `Join here: ${joinUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    url: joinUrl,
    startsAt: new Date(session.starts_at),
    durationMinutes: Math.max(
      15,
      Math.round((webinar.video_duration_seconds ?? 3600) / 60)
    ),
    organiserName: "Loopinglive",
    organiserEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
  });

  const filename = webinar.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename || "webinar"}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
