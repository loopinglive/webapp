import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmailGallery } from "@/components/admin/emails/EmailGallery";
import { getAdminUser } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Platform email" };
export const dynamic = "force-dynamic";

export default async function PlatformEmailPage() {
  // Same reasoning as /admin/analytics: a customer landing here is signed in
  // and simply does not own this page, so bouncing them to /login was telling
  // them to do something they had already done.
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/dashboard");

  return <EmailGallery />;
}
