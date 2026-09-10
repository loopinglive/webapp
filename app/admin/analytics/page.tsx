import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PlatformAnalytics } from "@/components/analytics/PlatformAnalytics";
import { getAdminUser } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Platform analytics" };

export default async function PlatformAnalyticsPage() {
  // /admin/login does not exist — anyone refused here used to land on a 404.
  // A customer who reaches this URL is signed in and simply does not own it,
  // so send them to their own dashboard rather than to a sign-in they have
  // already completed.
  const user = await getAdminUser();
  if (!user) redirect("/admin/dashboard");

  return (
    <Suspense fallback={<div className="min-h-dvh bg-void" />}>
      <PlatformAnalytics />
    </Suspense>
  );
}
