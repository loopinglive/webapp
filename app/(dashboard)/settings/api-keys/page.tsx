import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ApiKeyManager } from "@/components/api-keys/ApiKeyManager";
import { PageHeader } from "@/components/dashboard/page-header";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "API keys" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/settings/api-keys");

  return (
    <>
      <PageHeader title="API keys" subtitle="Programmatic access to your webinars, registrants and sessions." />
      <ApiKeyManager />
    </>
  );
}
