import type { Metadata } from "next";

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
      <ReportQueue />
    </>
  );
}
