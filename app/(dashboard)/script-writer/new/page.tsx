import type { Metadata } from "next";

import { ScriptGenerator } from "@/components/script-writer/ScriptGenerator";

export const metadata: Metadata = { title: "New script" };
export const dynamic = "force-dynamic";

export default function NewScriptPage() {
  return <ScriptGenerator />;
}
