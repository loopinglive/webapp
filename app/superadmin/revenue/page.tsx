import type { Metadata } from "next";

import { RevenueStats } from "@/components/superadmin/RevenueStats";

export const metadata: Metadata = { title: "Revenue · Super admin" };

export default function SuperAdminRevenuePage() {
  return (
    <>
      <header className="border-b border-[#1E1E2E] px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">Revenue</h1>
        <p className="mt-0.5 text-[13px] text-[#A0A0B0]">
          MRR counts recurring plans only — lifetime purchases are one-off revenue.
        </p>
      </header>
      <RevenueStats />
    </>
  );
}
