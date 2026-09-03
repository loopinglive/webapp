import type { Metadata } from "next";

import { GrowthStats } from "@/components/superadmin/GrowthStats";

export const metadata: Metadata = { title: "Growth · Super admin" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <header className="border-b border-[#1E1E2E] px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">
          Growth
        </h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-[#A0A0B0]">
          Activation, time to value, retention and feature adoption.
        </p>
      </header>
      <GrowthStats />
    </>
  );
}
