import type { Metadata } from "next";

import { ErrorLogViewer } from "@/components/superadmin/ErrorLogViewer";

export const metadata: Metadata = { title: "Errors · Super admin" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <header className="border-b border-[#1E1E2E] px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">
          Errors
        </h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-[#A0A0B0]">
          Client-side failures, grouped by message so one loop cannot bury the rest.
        </p>
      </header>
      <ErrorLogViewer />
    </>
  );
}
