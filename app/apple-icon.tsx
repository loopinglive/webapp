import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The iOS home-screen icon. iOS will not accept an SVG here, so this is the
 * one place the mark has to be rasterised — generated from the same geometry
 * as app/icon.svg rather than kept as a separate hand-made asset that could
 * drift from it.
 *
 * No rounded corners: iOS applies its own mask, and baking one in leaves a
 * visible dark seam inside Apple's radius.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6C47FF 0%, #00D4FF 100%)",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
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
    ),
    { ...size }
  );
}
