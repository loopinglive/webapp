import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/admin-auth";
import { getUserAccount } from "@/lib/billing/account";

export const dynamic = "force-dynamic";

// The dashboard is the admin's home.
export default async function AdminIndexPage() {
  const admin = await getAdminUser();
  if (admin) redirect("/admin/dashboard");

  const account = await getUserAccount();
  redirect(account ? "/admin/dashboard" : "/");
}
