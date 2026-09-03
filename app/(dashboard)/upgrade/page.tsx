import type { Metadata } from "next";
import { Suspense } from "react";

import { UpgradePage } from "@/components/billing/UpgradePage";
import { getUserAccount } from "@/lib/billing/account";
import { planPermissions } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Upgrade" };
export const dynamic = "force-dynamic";

export default async function Upgrade() {
  const permissions = planPermissions(await getUserAccount());

  return (
    <Suspense>
      <UpgradePage currentPlan={permissions.planSlug} />
    </Suspense>
  );
}
