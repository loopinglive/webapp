import { redirect } from "next/navigation";

import { SecondFactorGate } from "@/components/superadmin/SecondFactorGate";
import { SuperAdminShell } from "@/components/superadmin/SuperAdminShell";
import { hasPassedSecondFactor } from "@/lib/auth/second-factor";
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

  /*
   * Enrolled, but this browser has not proved it recently.
   *
   * The gate replaces the console rather than covering it. A modal over a
   * rendered page is not a gate — the page underneath has already run every
   * query on it, so the data was fetched before anyone was asked for a code.
   *
   * Only for admins who have actually turned 2FA on, so this cannot lock
   * anyone out of a console they have not enrolled in.
   */
  if (account.totp_enabled_at && !(await hasPassedSecondFactor(account.id))) {
    return <SecondFactorGate />;
  }

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
