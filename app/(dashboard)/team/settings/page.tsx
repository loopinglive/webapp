import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { TeamSettingsForm } from "@/components/teams/TeamSettingsForm";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Team settings" };
export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/team/settings");
  if (!account.team_id) redirect("/team");

  return (
    <>
      <PageHeader title="Team settings" subtitle="Name and identity." />
      <TeamSettingsForm teamId={account.team_id} />
    </>
  );
}
