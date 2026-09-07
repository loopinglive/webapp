import type { Metadata } from "next";

import { GdprRequestsPanel } from "@/components/security/GdprRequestsPanel";

export const metadata: Metadata = { title: "GDPR Requests" };

export default async function GdprRequestsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;

  return (
    <div className="px-6 py-8 lg:px-10">
      <h1 className="text-[22px] font-semibold tracking-tight text-white">GDPR Requests</h1>
      <p className="mt-1.5 max-w-[62ch] text-[13.5px] text-[#A0A0B0]">
        Attendees who submit a data request at loopinglive.com/gdpr-request for
        this webinar show up here. You have 30 days to respond — Loopinglive
        processes their data on your instruction, but the response is yours to
        give.
      </p>
      <div className="mt-6">
        <GdprRequestsPanel webinarId={webinarId} />
      </div>
    </div>
  );
}
