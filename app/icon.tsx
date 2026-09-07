import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "linear-gradient(135deg, #6C47FF 0%, #00D4FF 100%)",
        }}
      >
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, color: "white" }}>LL</span>
      </div>
    ),
    { ...size }
  );
}
