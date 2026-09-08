import type { Metadata } from "next";

import { DealPipelineBoard } from "@/components/crm/DealPipelineBoard";

export const metadata: Metadata = { title: "Deals" };
export const dynamic = "force-dynamic";

export default function CrmPage() {
  return <DealPipelineBoard />;
}
