import type { Metadata } from "next";

import { TranslationsEditor } from "@/components/admin/webinar/TranslationsEditor";

export const metadata: Metadata = { title: "Translations" };

export default async function TranslationsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <TranslationsEditor webinarId={webinarId} />;
}
