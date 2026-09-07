import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { SSOConfiguration } from "@/components/security/SSOConfiguration";
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
      <PageHeader title="Team settings" subtitle="Name, identity, and single sign-on." />
      <TeamSettingsForm teamId={account.team_id} />
      <div className="px-6 pb-8 lg:px-10">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Single sign-on</h2>
        <SSOConfiguration teamId={account.team_id} />
      </div>
    </>
  );
}
