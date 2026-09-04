import type { Metadata } from "next";

import { ScriptEditor } from "@/components/script-writer/ScriptEditor";

export const metadata: Metadata = { title: "Script" };
export const dynamic = "force-dynamic";

export default async function ScriptDetailPage({
  params,
}: {
  params: Promise<{ scriptId: string }>;
}) {
  const { scriptId } = await params;
  return <ScriptEditor scriptId={scriptId} />;
}
