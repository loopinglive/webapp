import type { Metadata } from "next";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Attendees" };

export default function AttendeesPage() {
  return (
    <>
      <PageHeader
        title="Attendees"
        subtitle="Every registrant, their watch depth, and what they did with the offer."
      />
      <div className="px-6 py-8 lg:px-10">
        <EmptyState
          title="No attendees yet"
          body="Registrations appear here the moment someone signs up for one of your sessions."
        />
      </div>
    </>
  );
}
