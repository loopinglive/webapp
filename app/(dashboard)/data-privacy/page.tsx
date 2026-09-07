import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { DataPrivacyCenter } from "@/components/security/DataPrivacyCenter";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Data Privacy" };
export const dynamic = "force-dynamic";

export default async function DataPrivacyPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/data-privacy");

  return (
    <>
      <PageHeader
        title="Data Privacy"
        subtitle="Download or delete the data Loopinglive holds about you."
      />
      <div className="px-6 py-8 lg:px-10">
        <DataPrivacyCenter />
      </div>
    </>
  );
}
