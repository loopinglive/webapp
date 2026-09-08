import type { Metadata } from "next";

import { FederationManager } from "@/components/federation/FederationManager";

export const metadata: Metadata = { title: "Federation" };
export const dynamic = "force-dynamic";

export default function FederationPage() {
  return <FederationManager />;
}
