import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// The dashboard is the admin's home.
export default async function AdminIndexPage() {
  const admin = await getAdminUser();
  redirect(admin ? "/admin/dashboard" : "/");
}
