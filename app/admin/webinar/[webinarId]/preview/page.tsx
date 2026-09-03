import type { Metadata } from "next";

import { WebinarPreview } from "@/components/admin/preview/WebinarPreview";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";

export const metadata: Metadata = { title: "Preview" };
export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;

  return (
    <>
      <SectionHeader
        title="Preview"
        description="Watch your webinar exactly as an attendee will, without it counting for anything."
      />
      <WebinarPreview webinarId={webinarId} />
    </>
  );
}
