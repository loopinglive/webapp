import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AdminLivePanel } from "@/components/admin/AdminLivePanel";
import { requireSessionAccess } from "@/lib/webinar-access";

export const metadata: Metadata = { title: "Live session" };
export const dynamic = "force-dynamic";

export default async function AdminLivePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Checked on the server against the signed session, and again inside every
  // admin API route — the panel is not merely hidden, it is closed.
  const access = await requireSessionAccess(sessionId);
  if (!access.ok) redirect("/login?next=/admin/live/" + sessionId);

  return <AdminLivePanel sessionId={sessionId} />;
}
