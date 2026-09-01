import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AdminLivePanel } from "@/components/admin/AdminLivePanel";
import { getAdminUser } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Live session" };
export const dynamic = "force-dynamic";

export default async function AdminLivePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  // Checked on the server against the signed session, and again inside every
  // admin API route — the panel is not merely hidden, it is closed.
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  const { sessionId } = await params;
  return <AdminLivePanel sessionId={sessionId} />;
}
