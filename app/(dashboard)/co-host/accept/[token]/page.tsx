import type { Metadata } from "next";

import { CoHostAccept } from "@/components/co-hosting/CoHostAccept";

export const metadata: Metadata = { title: "Co-host invitation" };
export const dynamic = "force-dynamic";

export default async function CoHostAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CoHostAccept token={token} />;
}
