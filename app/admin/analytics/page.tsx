import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PlatformAnalytics } from "@/components/analytics/PlatformAnalytics";
import { getAdminUser } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Platform analytics" };

export default async function PlatformAnalyticsPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0A0A0F]" />}>
      <PlatformAnalytics />
    </Suspense>
  );
}
