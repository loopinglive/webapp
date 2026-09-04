import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TeamDashboard } from "@/components/teams/TeamDashboard";
import { PageHeader } from "@/components/dashboard/page-header";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/team");

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Everyone collaborating on webinars under one subscription."
      />
      <TeamDashboard teamId={account.team_id} />
    </>
  );
}
