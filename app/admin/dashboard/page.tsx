import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { WebinarList } from "@/components/admin/dashboard/WebinarList";
import { getAdminUser } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  return <WebinarList adminEmail={admin.email ?? null} />;
}
