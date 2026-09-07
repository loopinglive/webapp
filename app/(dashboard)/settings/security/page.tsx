import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuditLogViewer } from "@/components/security/AuditLogViewer";
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
        subtitle="Every significant action on your account, who did it, and when."
      />
      <div className="px-6 py-8 lg:px-10">
        <AuditLogViewer />
      </div>
    </>
  );
}
