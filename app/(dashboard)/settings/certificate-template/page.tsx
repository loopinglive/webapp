import type { Metadata } from "next";

import { CertificateTemplateEditor } from "@/components/settings/CertificateTemplateEditor";

export const metadata: Metadata = { title: "Certificate Design" };

export default function CertificateTemplatePage() {
  return <CertificateTemplateEditor />;
}
