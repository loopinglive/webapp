import type { Metadata } from "next";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Automations" };

export default function AutomationsPage() {
  return (
    <>
      <PageHeader
        title="Automations"
        subtitle="Reminders before, follow-up after — email, SMS, and WhatsApp by segment."
      />
      <div className="px-6 py-8 lg:px-10">
        <EmptyState
          title="No sequences yet"
          body="Build reminder and follow-up sequences that branch on watch depth, offer clicks, and purchases."
        />
      </div>
    </>
  );
}
