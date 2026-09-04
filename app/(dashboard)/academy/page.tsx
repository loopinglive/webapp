import type { Metadata } from "next";

import { AcademyHome } from "@/components/academy/AcademyHome";

export const metadata: Metadata = { title: "Academy" };
export const dynamic = "force-dynamic";

export default function AcademyPage() {
  return <AcademyHome />;
}
