import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generates the PWA/app icon on the fly, from the same geometry as
 * app/icon.svg and components/brand/Logo.tsx — one mark, drawn at whatever
 * size is asked for, rather than a set of exported PNGs that drift apart.
 *
 * Maskable icons get extra inset padding so Android's circular crop does not
 * clip the mark.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = Math.min(Math.max(Number(searchParams.get("size")) || 512, 32), 512);
  const maskable = searchParams.get("maskable") === "1";
  const padding = maskable ? Math.round(size * 0.2) : Math.round(size * 0.08);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0F",
        }}
      >
        <div
          style={{
            width: size - padding * 2,
            height: size - padding * 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: size * 0.22,
            background: "linear-gradient(135deg, #6C47FF 0%, #00D4FF 100%)",
          }}
        >
          <svg width={(size - padding * 2) * 0.66} height={(size - padding * 2) * 0.66} viewBox="0 0 32 32" fill="none">
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
      </div>
    ),
    { width: size, height: size }
  );
}
