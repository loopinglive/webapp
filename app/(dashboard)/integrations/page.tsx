import type { Metadata } from "next";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="Zapier, CRMs, pixels, and API access."
      />
      <div className="px-6 py-8 lg:px-10">
        <EmptyState
          title="Nothing connected"
          body="Connect your CRM, tracking pixels, and webhooks to push registrations everywhere they need to go."
        />
      </div>
    </>
  );
}
