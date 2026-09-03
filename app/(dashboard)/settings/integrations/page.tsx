import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IntegrationsHub } from "@/components/integrations/IntegrationsHub";
import { PageHeader } from "@/components/dashboard/page-header";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/settings/integrations");

  return (
    <>
      <PageHeader title="Integrations" subtitle="Connect the tools you already use. Every registrant flows into them automatically." />
      <IntegrationsHub />
    </>
  );
}
