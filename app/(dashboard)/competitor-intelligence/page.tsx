import type { Metadata } from "next";

import { CompetitorIntelligence } from "@/components/intelligence/CompetitorIntelligence";

export const metadata: Metadata = { title: "Competitor Intelligence" };

export default function CompetitorIntelligencePage() {
  return <CompetitorIntelligence />;
}
