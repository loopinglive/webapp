import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { WebinarForm } from "@/components/admin/webinar/WebinarForm";
import { getAdminUser } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "New webinar" };
export const dynamic = "force-dynamic";

export default async function NewWebinarPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  return (
    <main className="min-h-dvh bg-[#0A0A0F]">
      <WebinarForm />
    </main>
  );
}
