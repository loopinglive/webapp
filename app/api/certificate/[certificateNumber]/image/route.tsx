import { ImageResponse } from "next/og";

import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_DESIGN = {
  headline: "Certificate of Attendance",
  subheadline: "This certifies that",
  signature_name: "",
  signature_title: "",
  accent_colour: "#6C47FF",
  background_colour: "#0A0A0F",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ certificateNumber: string }> }
) {
  const { certificateNumber } = await params;
  const supabase = createServiceClient();

  const { data: row } = await supabase
    .from("certificates")
    .select("registrant_id, webinar_id, issued_at, template_id")
    .eq("certificate_number", certificateNumber)
    .maybeSingle();

  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const [{ data: registrant }, { data: webinar }] = await Promise.all([
    supabase.from("registrants").select("full_name").eq("id", row.registrant_id).maybeSingle(),
    supabase.from("webinars").select("title").eq("id", row.webinar_id).maybeSingle(),
  ]);

  const certificate = {
    recipient_name: registrant?.full_name ?? "Unknown",
    webinar_title: webinar?.title ?? "Unknown webinar",
    issued_at: row.issued_at,
    template_id: row.template_id,
  };

  const { data: template } = certificate.template_id
    ? await supabase
        .from("certificate_templates")
        .select("design")
        .eq("id", certificate.template_id)
        .maybeSingle()
    : { data: null };

  const design = { ...DEFAULT_DESIGN, ...(template?.design as object | null) };
  const issuedDate = new Date(certificate.issued_at as string).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "800px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: design.background_colour,
          border: `14px solid ${design.accent_colour}`,
          fontFamily: "Inter, sans-serif",
          color: "white",
          padding: "60px",
        }}
      >
        {design.headline && (
          <div style={{ fontSize: 28, fontWeight: 700, textAlign: "center" }}>{design.headline}</div>
        )}
        <div
          style={{
            fontSize: 20,
            letterSpacing: 4,
            color: design.accent_colour,
            textTransform: "uppercase",
            marginTop: design.headline ? 20 : 0,
          }}
        >
          {design.subheadline}
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 24, textAlign: "center" }}>
          {certificate.recipient_name}
        </div>
        <div style={{ fontSize: 24, marginTop: 32, textAlign: "center", opacity: 0.75 }}>
          has completed
        </div>
        <div style={{ fontSize: 34, fontWeight: 600, marginTop: 12, textAlign: "center", maxWidth: 900 }}>
          {certificate.webinar_title}
        </div>
        <div style={{ fontSize: 18, marginTop: 48, opacity: 0.6 }}>{issuedDate}</div>
        {design.signature_name && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{design.signature_name}</div>
            {design.signature_title && (
              <div style={{ fontSize: 15, opacity: 0.6 }}>{design.signature_title}</div>
            )}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 40, fontSize: 13, opacity: 0.4 }}>
          Certificate No. {certificateNumber}
        </div>
      </div>
    ),
    { width: 1200, height: 800 }
  );
}
