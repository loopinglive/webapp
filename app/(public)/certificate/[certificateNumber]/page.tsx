import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function load(certificateNumber: string) {
  const supabase = createServiceClient();

  const { data: certificate } = await supabase
    .from("certificates")
    .select("registrant_id, webinar_id, issued_at, certificate_number")
    .eq("certificate_number", certificateNumber)
    .maybeSingle();
  if (!certificate) return null;

  // Recipient name and webinar title are read live off their own tables
  // rather than frozen on the certificate row — see the comment in
  // lib/webinar-completion.ts on why that row never stores them directly.
  const [{ data: registrant }, { data: webinar }] = await Promise.all([
    supabase.from("registrants").select("full_name").eq("id", certificate.registrant_id).maybeSingle(),
    supabase.from("webinars").select("title").eq("id", certificate.webinar_id).maybeSingle(),
  ]);

  return {
    recipient_name: registrant?.full_name ?? "Unknown",
    webinar_title: webinar?.title ?? "Unknown webinar",
    issued_at: certificate.issued_at,
    certificate_number: certificate.certificate_number,
  };
}

export const metadata: Metadata = { title: "Verify certificate" };

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const { certificateNumber } = await params;
  const certificate = await load(certificateNumber);
  if (!certificate) notFound();

  const imageUrl = `/api/certificate/${certificateNumber}/image`;

  return (
    <main className="min-h-dvh bg-[#0A0A0F] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-2 text-[#00C851]">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-[13.5px] font-medium">This certificate is verified and authentic</span>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Certificate for ${certificate.recipient_name}`}
          className="w-full rounded-xl border border-[#1E1E2E]"
        />

        <dl className="mt-8 grid grid-cols-2 gap-6 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-6 text-[13.5px]">
          <div>
            <dt className="text-[#6E6E80]">Recipient</dt>
            <dd className="mt-1 font-medium text-white">{certificate.recipient_name}</dd>
          </div>
          <div>
            <dt className="text-[#6E6E80]">Webinar</dt>
            <dd className="mt-1 font-medium text-white">{certificate.webinar_title}</dd>
          </div>
          <div>
            <dt className="text-[#6E6E80]">Issued</dt>
            <dd className="mt-1 font-medium text-white">
              {new Date(certificate.issued_at as string).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-[#6E6E80]">Certificate No.</dt>
            <dd className="mt-1 font-mono font-medium text-white">{certificate.certificate_number}</dd>
          </div>
        </dl>

        <a
          href={imageUrl}
          download={`certificate-${certificateNumber}.png`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#6C47FF] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#7C57FF]"
        >
          Download certificate
        </a>
      </div>
    </main>
  );
}
