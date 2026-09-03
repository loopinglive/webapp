import type { Metadata } from "next";

import { MaintenanceToggle } from "@/components/superadmin/MaintenanceToggle";
import { IpAllowlistPanel } from "@/components/superadmin/IpAllowlistPanel";
import { TwoFactorPanel } from "@/components/superadmin/TwoFactorPanel";
import { PlatformHealth } from "@/components/superadmin/PlatformHealth";

export const metadata: Metadata = { title: "Platform health · Super admin" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <header className="border-b border-[#1E1E2E] px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">
          Platform health
        </h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-[#A0A0B0]">
          Scheduled jobs, queues, delivery failures and third-party credentials.
        </p>
      </header>
      <div className="space-y-4 px-6 pt-6 lg:px-8">
        <TwoFactorPanel />
        <IpAllowlistPanel />
        <MaintenanceToggle />
      </div>
      <PlatformHealth />
    </>
  );
}
