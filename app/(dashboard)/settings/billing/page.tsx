import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BillingSettings } from "@/components/billing/BillingSettings";
import { PageHeader } from "@/components/dashboard/page-header";
import { getUserAccount } from "@/lib/billing/account";
import { planPermissions, type PlanSlug } from "@/lib/billing/plans";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/settings/billing");

  const permissions = planPermissions(account);

  const { data: invoices } = await createServiceClient()
    .from("invoices")
    .select("id, amount, currency, status, plan_slug, paid_at, created_at, invoice_pdf_url")
    .eq("user_id", account.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Your plan, your invoices, and how to change either."
      />
      <BillingSettings
        planSlug={permissions.planSlug as PlanSlug}
        planName={permissions.plan.name}
        planExpiresAt={account.plan_expires_at}
        subscriptionStatus={account.subscription_status}
        invoices={invoices ?? []}
      />
    </>
  );
}
