import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { WebinarForm } from "@/components/admin/webinar/WebinarForm";
import { getAdminUser } from "@/lib/admin-auth";
import { getUserAccount } from "@/lib/billing/account";

export const metadata: Metadata = { title: "New webinar" };
export const dynamic = "force-dynamic";

export default async function NewWebinarPage() {
  const admin = await getAdminUser();
  if (!admin) {
    const account = await getUserAccount();
    if (!account) redirect("/login?next=/admin/webinar/new");
    if (account.is_suspended) redirect("/login?suspended=1");
  }

  return (
    <main className="min-h-dvh bg-[#0A0A0F]">
      <WebinarForm />
    </main>
  );
}
