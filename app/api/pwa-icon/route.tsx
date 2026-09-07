import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generates the PWA/app icon on the fly — no design asset in /public yet, so
 * a generated monogram in brand colours beats a missing icon. Maskable icons
 * get extra inset padding so Android's circular crop does not clip the mark.
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
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: size * 0.42,
              color: "white",
              letterSpacing: -2,
            }}
          >
            LL
          </span>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
