import type { Metadata } from "next";

import { ScriptListPage } from "@/components/script-writer/ScriptListPage";

export const metadata: Metadata = { title: "Script writer" };
export const dynamic = "force-dynamic";

export default function ScriptWriterPage() {
  return <ScriptListPage />;
}
