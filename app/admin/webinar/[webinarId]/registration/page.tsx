import type { Metadata } from "next";

import { RegistrationPageBuilder } from "@/components/registration-builder/RegistrationPageBuilder";

export const metadata: Metadata = { title: "Registration page" };

export default async function RegistrationBuilderPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <RegistrationPageBuilder webinarId={webinarId} />;
}
