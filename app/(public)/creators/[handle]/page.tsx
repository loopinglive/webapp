import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorProfile } from "@/components/creators/CreatorProfile";
import { Footer } from "@/components/marketing/footer";
import { Nav } from "@/components/marketing/nav";
import { getUserAccount } from "@/lib/billing/account";
import { getCreatorUpcomingWebinars, getPublicCreatorProfile, isFollowing } from "@/lib/creators/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicCreatorProfile(handle);
  return {
    title: profile ? profile.full_name : "Creator",
    description: profile?.bio ?? undefined,
  };
}

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getPublicCreatorProfile(handle);
  if (!profile) notFound();

  const account = await getUserAccount();
  const [upcomingWebinars, following] = await Promise.all([
    getCreatorUpcomingWebinars(profile.user_id),
    account ? isFollowing(account.id, profile.id) : Promise.resolve(false),
  ]);

  return (
    <main className="relative min-h-screen">
      <Nav />
      <CreatorProfile
        profile={profile}
        upcomingWebinars={upcomingWebinars}
        isFollowing={following}
        canFollow={Boolean(account) && account?.id !== profile.user_id}
      />
      <Footer />
    </main>
  );
}
