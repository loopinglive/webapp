import type { Metadata } from "next";

import { OfferExperiments } from "@/components/admin/experiments/OfferExperiments";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";

export const metadata: Metadata = { title: "Split tests" };
export const dynamic = "force-dynamic";

export default async function ExperimentsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;

  return (
    <>
      <SectionHeader
        title="Split tests"
        description="Try a different price, headline or reveal time, and let the numbers decide."
      />
      <OfferExperiments webinarId={webinarId} />
    </>
  );
}
