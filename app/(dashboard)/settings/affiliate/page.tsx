import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AffiliateDashboard } from "@/components/affiliate/AffiliateDashboard";
import { PageHeader } from "@/components/dashboard/page-header";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Affiliate" };
export const dynamic = "force-dynamic";

export default async function AffiliatePage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/settings/affiliate");

  return (
    <>
      <PageHeader
        title="Affiliate"
        subtitle="Share Loopinglive and earn on every host you bring."
      />
      <AffiliateDashboard />
    </>
  );
}
