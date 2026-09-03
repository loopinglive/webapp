import type { Metadata } from "next";

import { UserDetail } from "@/components/superadmin/UserDetail";

export const metadata: Metadata = { title: "User · Super admin" };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <UserDetail userId={userId} />;
}
