import { ImageResponse } from "next/og";

import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "Webinar registration";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card for a webinar, covering its register / waiting-room /
 * thank-you pages.
 *
 * This is the link that actually gets shared — a host pastes their
 * registration URL into WhatsApp, a group chat, an ad — so it shows their
 * webinar rather than our branding: the title they wrote, when the next
 * session runs, and their own logo when the registration builder has one.
 * The Loopinglive mark stays small in the corner; the card belongs to the
 * host, not to us.
 *
 * Falls back to the generic root card's styling if the webinar cannot be
 * read, rather than erroring — a broken image and no image look the same to
 * a scraper, and both lose the preview.
 */
export default async function WebinarOpengraphImage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, description, broadcast_label")
    .eq("id", webinarId)
    .maybeSingle();

  const [{ data: config }, { data: sessions }] = await Promise.all([
    supabase.from("registration_page_config").select("logo_url").eq("webinar_id", webinarId).maybeSingle(),
    supabase
      .from("webinar_sessions")
      .select("starts_at")
      .eq("webinar_id", webinarId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1),
  ]);

  const title = webinar?.title ?? SITE.name;
  const label = (webinar?.broadcast_label ?? "live").toUpperCase();
  const next = sessions?.[0]?.starts_at;
  const when = next
    ? new Date(next).toLocaleString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      })
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 78,
          background: "#0A0A0F",
          backgroundImage:
            "radial-gradient(1000px 500px at 8% -15%, rgba(108,71,255,0.32), transparent 60%), radial-gradient(760px 400px at 105% 115%, rgba(0,212,255,0.16), transparent 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255,77,109,0.14)",
              border: "1px solid rgba(255,77,109,0.45)",
              color: "#FF6B84",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 999, background: "#FF4D6D" }} />
            {label}
          </span>
          {config?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo_url} alt="" width={56} height={56} style={{ borderRadius: 12, objectFit: "cover" }} />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: title.length > 60 ? 56 : 70,
              fontWeight: 700,
              color: "#F4F4F8",
              letterSpacing: -2,
              lineHeight: 1.12,
              // Two lines is the most a preview shows at thumbnail size.
              display: "block",
              maxWidth: 1000,
            }}
          >
            {title.length > 110 ? `${title.slice(0, 110)}…` : title}
          </span>
          {when && (
            <span style={{ marginTop: 26, fontSize: 30, color: "#A0A0B0" }}>{when}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="og-mark" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6C47FF" />
                <stop offset="1" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
            <circle
              cx="16"
              cy="16"
              r="12"
              stroke="url(#og-mark)"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeDasharray="64.9 10.5"
            />
            <path
              d="M13.6 11.1 L21.8 16 L13.6 20.9 Z"
              fill="url(#og-mark)"
              stroke="url(#og-mark)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="26.9" cy="10.9" r="3.1" fill="#00D4FF" />
          </svg>
          <span style={{ fontSize: 25, color: "#6E6E80" }}>Powered by {SITE.name}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
