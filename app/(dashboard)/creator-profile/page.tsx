import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { CreatorProfileEditor } from "@/components/creators/CreatorProfileEditor";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Creator Profile" };
export const dynamic = "force-dynamic";

export default async function CreatorProfileSettingsPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/creator-profile");

  return (
    <>
      <PageHeader
        title="Creator Profile"
        subtitle="Optional — a public page that helps attendees find your webinars."
      />
      <div className="px-6 py-8 lg:px-10">
        <CreatorProfileEditor />
      </div>
    </>
  );
}
