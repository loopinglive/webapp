import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WebhookManager } from "@/components/webhooks/WebhookManager";
import { PageHeader } from "@/components/dashboard/page-header";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Webhooks" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/settings/webhooks");

  return (
    <>
      <PageHeader title="Webhooks" subtitle="Send every webinar event to Zapier, or anywhere else that accepts a POST." />
      <WebhookManager />
    </>
  );
}
