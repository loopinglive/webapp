import { redirect } from "next/navigation";

import { WebinarSetupShell } from "@/components/admin/webinar/WebinarSetupShell";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function WebinarSetupLayout({
  children,
  params,
}: LayoutProps<"/admin/webinar/[webinarId]">) {
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  const { webinarId } = await params;

  return <WebinarSetupShell webinarId={webinarId}>{children}</WebinarSetupShell>;
}
