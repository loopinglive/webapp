import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { WhiteLabelConfig } from "@/components/white-label/WhiteLabelConfig";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "White label" };
export const dynamic = "force-dynamic";

export default async function WhiteLabelPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/settings/white-label");

  return (
    <>
      <PageHeader
        title="White label"
        subtitle="Make Loopinglive disappear — your brand, your domain, your emails."
      />
      <WhiteLabelConfig />
    </>
  );
}
