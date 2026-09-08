import type { Metadata } from "next";

import { AutonomousBuilder } from "@/components/autonomous/AutonomousBuilder";

export const metadata: Metadata = { title: "Autonomous builder" };
export const dynamic = "force-dynamic";

export default function AutonomousPage() {
  return <AutonomousBuilder />;
}
