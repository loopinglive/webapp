import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TeamInvitationBanner } from "@/components/teams/TeamInvitationBanner";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Join team" };
export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/team");

  const account = await getUserAccount();
  if (!account) redirect(`/login?next=/team/accept-invite?token=${token}`);

  return <TeamInvitationBanner token={token} />;
}
