import type { Metadata } from "next";

import { DeveloperPortal } from "@/components/plugins/DeveloperPortal";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Plugin Developer Portal" };

export default function PluginDevelopPage() {
  return (
    <>
      <PageHeader
        title="Plugin Developer Portal"
        subtitle="Build, submit, and test plugins against the real sandbox bridge."
      />
      <div className="px-6 py-8 lg:px-10">
        <DeveloperPortal />
      </div>
    </>
  );
}
