import { ImageResponse } from "next/og";

import { SITE } from "@/lib/constants";

export const runtime = "nodejs";
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card every shared link falls back to.
 *
 * Next wires this file up as og:image (with width/height, which WhatsApp and
 * iMessage both need before they will render a preview at all) and child
 * routes inherit it unless they define their own. Until now nothing did:
 * openGraph in the root layout had a title and a description and no image, so
 * a link pasted into WhatsApp arrived as a line of grey text.
 *
 * Deliberately flat — one gradient, the mark, two lines of type. Scrapers cap
 * the image size they will fetch, and a heavy render risks being dropped for
 * being too large, which looks identical to having no card at all.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "#0A0A0F",
          backgroundImage:
            "radial-gradient(1000px 500px at 12% -10%, rgba(108,71,255,0.30), transparent 60%), radial-gradient(800px 420px at 100% 110%, rgba(0,212,255,0.18), transparent 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div
            style={{
              width: 108,
              height: 108,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 26,
              background: "linear-gradient(135deg, #6C47FF 0%, #00D4FF 100%)",
            }}
          >
            <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="#fff"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeDasharray="64.9 10.5"
              />
              <path
                d="M13.6 11.1 L21.8 16 L13.6 20.9 Z"
                fill="#fff"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="26.9" cy="10.9" r="3.4" fill="#fff" />
            </svg>
          </div>
          <span style={{ fontSize: 62, fontWeight: 700, color: "#F4F4F8", letterSpacing: -1.5 }}>
            {SITE.name}
          </span>
        </div>

        <span style={{ marginTop: 40, fontSize: 46, fontWeight: 600, color: "#F4F4F8", letterSpacing: -1 }}>
          {SITE.tagline}
        </span>
        <span style={{ marginTop: 20, fontSize: 27, color: "#A0A0B0", lineHeight: 1.4, maxWidth: 880 }}>
          Automated webinars that run on a schedule and convert like live ones.
        </span>
      </div>
    ),
    { ...size }
  );
}
