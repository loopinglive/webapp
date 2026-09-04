import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { TeamMemberList } from "@/components/teams/TeamMemberList";
import { getUserAccount } from "@/lib/billing/account";
import { teamRoleCan, type TeamRole } from "@/lib/teams/roles";

export const metadata: Metadata = { title: "Team members" };
export const dynamic = "force-dynamic";

export default async function TeamMembersPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/team/members");
  if (!account.team_id) redirect("/team");

  const role = account.team_role as TeamRole | null;

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Who is on the team, and what they can do."
      />
      <TeamMemberList
        teamId={account.team_id}
        currentUserId={account.id}
        canManage={teamRoleCan(role, "manage_members")}
      />
    </>
  );
}
