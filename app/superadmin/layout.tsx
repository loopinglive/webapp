import { redirect } from "next/navigation";

import { SuperAdminShell } from "@/components/superadmin/SuperAdminShell";
import { getUserAccount } from "@/lib/billing/account";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getUserAccount();
  // Non-admins are sent to their own dashboard rather than shown a 403 — the
  // panel's existence is not something to advertise.
  if (!account) redirect("/login?next=/superadmin");
  if (!account.is_admin) redirect("/dashboard");

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
