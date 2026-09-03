import { NextResponse } from "next/server";

import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { sendEmail } from "@/lib/messaging/providers";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How far ahead to look. Enough time to fix a video before anyone arrives. */
const LOOKAHEAD_MINUTES = 90;

/**
 * Checks that upcoming sessions can actually play.
 *
 * A session going live with a broken video URL fails in front of everyone who
 * turned up, and nobody finds out until they complain. A HEAD request an hour
 * beforehand turns that into an email the host can act on.
 *
 * Deliberately does not block the session: a transient 503 from a CDN should
 * warn, not cancel a webinar people registered for.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + LOOKAHEAD_MINUTES * 60_000);

  const { data: sessions } = await supabase
    .from("webinar_sessions")
    .select("id, webinar_id, starts_at")
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString());

  if (!sessions?.length) return NextResponse.json({ checked: 0 });

  const webinarIds = [...new Set(sessions.map((s) => s.webinar_id))];

  const { data: webinars } = await supabase
    .from("webinars")
    .select("id, title, video_url, owner_id, status")
    .in("id", webinarIds);

  const results: { webinarId: string; ok: boolean; reason: string | null }[] = [];

  for (const webinar of webinars ?? []) {
    if (webinar.status !== "published") continue;

    if (!webinar.video_url) {
      results.push({ webinarId: webinar.id, ok: false, reason: "No video is attached" });
      continue;
    }

    let ok = false;
    let reason: string | null = null;

    try {
      // HEAD rather than GET: we want the status and the content type, not
      // several hundred megabytes of video.
      const response = await fetch(webinar.video_url, {
        method: "HEAD",
        signal: AbortSignal.timeout(10_000),
      });

      ok = response.ok;
      if (!ok) reason = `The video returned HTTP ${response.status}`;
      else if (!response.headers.get("content-type")?.startsWith("video")) {
        ok = false;
        reason = "The video URL does not return a video";
      }
    } catch (error) {
      reason = `The video could not be reached: ${(error as Error).message}`;
    }

    results.push({ webinarId: webinar.id, ok, reason });

    if (ok || !webinar.owner_id) continue;

    const { data: owner } = await supabase
      .from("user_accounts")
      .select("email, full_name")
      .eq("id", webinar.owner_id)
      .maybeSingle();

    if (!owner?.email) continue;

    const session = sessions.find((s) => s.webinar_id === webinar.id);

    try {
      const { subject, html, text } = renderPlatformEmail(
        "host_video_processing_failed",
        {
          host_name: (owner.full_name || "there").split(" ")[0],
          webinar_title: webinar.title,
          video_name: "the attached video",
          failure_reason: reason ?? "unknown",
          next_session: session
            ? new Date(session.starts_at).toLocaleString("en-GB", {
                dateStyle: "long",
                timeStyle: "short",
              })
            : "soon",
          webinar_url: `${SITE.url}/admin/webinar/${webinar.id}`,
          support_email: "support@loopinglive.com",
        },
        { brandName: "Loopinglive" }
      );

      await sendEmail({
        to: owner.email,
        fromName: "Loopinglive",
        fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
        subject,
        html,
        text,
      });
    } catch {
      /* the check still ran; the notification is best effort */
    }
  }

  return NextResponse.json({
    checked: results.length,
    failing: results.filter((r) => !r.ok).length,
    results,
  });
}
