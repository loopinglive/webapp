import type { Metadata } from "next";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Watch-depth heatmaps, drop-off, conversion, and source breakdown."
      />
      <div className="px-6 py-8 lg:px-10">
        <EmptyState
          title="No sessions to measure"
          body="Once a webinar has run, its heatmap and conversion numbers land here."
        />
      </div>
    </>
  );
}
