import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { CeleBioSettings } from "@/components/settings/CeleBioSettings";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Cele.bio" };
export const dynamic = "force-dynamic";

export default async function CeleBioPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/settings/cele-bio");

  return (
    <>
      <PageHeader
        title="Cele.bio"
        subtitle="List your webinars as products on your Cele.bio profile page."
      />
      <CeleBioSettings />
    </>
  );
}
