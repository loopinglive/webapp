import type { Metadata } from "next";

import { EnterpriseLanding } from "@/components/enterprise/EnterpriseLanding";

export const metadata: Metadata = {
  title: "Enterprise · Loopinglive",
  description: "Custom solutions for organisations running high-volume webinars.",
};
export const dynamic = "force-dynamic";

export default function EnterprisePage() {
  return <EnterpriseLanding />;
}
