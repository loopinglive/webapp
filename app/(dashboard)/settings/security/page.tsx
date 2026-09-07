import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuditLogViewer } from "@/components/security/AuditLogViewer";
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup";
import { PageHeader } from "@/components/dashboard/page-header";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const account = await getUserAccount();
  if (!account) redirect("/login?next=/settings/security");

  return (
    <>
      <PageHeader
        title="Security"
        subtitle="Two-factor authentication, and every significant action on your account."
      />
      <div className="space-y-8 px-6 py-8 lg:px-10">
        <TwoFactorSetup />
        <AuditLogViewer />
      </div>
    </>
  );
}
