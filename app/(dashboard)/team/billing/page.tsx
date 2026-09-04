import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { TeamBillingClient } from "@/components/teams/TeamBillingClient";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Team billing" };
export const dynamic = "force-dynamic";

export default async function TeamBillingPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/team/billing");
  if (!account.team_id) redirect("/team");

  return (
    <>
      <PageHeader title="Team billing" subtitle="Plan, usage and payment." />
      <TeamBillingClient teamId={account.team_id} />
    </>
  );
}
