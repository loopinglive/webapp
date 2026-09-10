import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { WebinarList } from "@/components/admin/dashboard/WebinarList";
import { getAdminUser } from "@/lib/admin-auth";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await getAdminUser();
  if (admin) return <WebinarList adminEmail={admin.email ?? null} isPlatformAdmin />;

  const account = await getUserAccount();
  if (!account) redirect("/login?next=/admin/dashboard");
  if (account.is_suspended) redirect("/login?suspended=1");

  // A customer runs their own webinars from this same page. The platform
  // operator's tools are not theirs, so the header is told which one it is
  // rather than assuming everyone who reaches here is staff.
  return <WebinarList adminEmail={account.email} isPlatformAdmin={false} />;
}
