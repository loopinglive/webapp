import type { Metadata } from "next";

import { CoHostingList } from "@/components/co-hosting/CoHostingList";

export const metadata: Metadata = { title: "Co-hosting" };
export const dynamic = "force-dynamic";

export default function CoHostingPage() {
  return <CoHostingList />;
}
