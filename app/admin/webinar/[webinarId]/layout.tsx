import { redirect } from "next/navigation";

import { WebinarSetupShell } from "@/components/admin/webinar/WebinarSetupShell";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

export default async function WebinarSetupLayout({
  children,
  params,
}: LayoutProps<"/admin/webinar/[webinarId]">) {
  const { webinarId } = await params;

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) redirect("/login?next=/admin/webinar/" + webinarId);

  return <WebinarSetupShell webinarId={webinarId}>{children}</WebinarSetupShell>;
}
