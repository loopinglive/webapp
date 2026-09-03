import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmailGallery } from "@/components/admin/emails/EmailGallery";
import { getAdminUser } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Platform email" };
export const dynamic = "force-dynamic";

export default async function PlatformEmailPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login");

  return <EmailGallery />;
}
