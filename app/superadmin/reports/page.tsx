import type { Metadata } from "next";

import { FlaggedHosts } from "@/components/superadmin/FlaggedHosts";
import { ReportQueue } from "@/components/superadmin/ReportQueue";

export const metadata: Metadata = { title: "Reports · Super admin" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <header className="border-b border-[#1E1E2E] px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">
          Reports
        </h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-[#A0A0B0]">
          What people watching have told us is wrong. Anyone can sign up and put
          a video in front of an audience they bring themselves, so this is how
          you find out before someone outside tells you.
        </p>
      </header>
      <div className="space-y-2 px-6 pt-6 lg:px-8">
        <h2 className="text-[13px] font-semibold text-white">
          Flagged on chargebacks
        </h2>
        <FlaggedHosts />
      </div>

      <div className="mt-2 border-t border-[#1E1E2E] px-6 pt-5 lg:px-8">
        <h2 className="text-[13px] font-semibold text-white">Reported by attendees</h2>
      </div>
      <ReportQueue />
    </>
  );
}
