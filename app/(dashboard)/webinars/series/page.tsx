import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/page-header";
import { SeriesList } from "@/components/webinar-series/SeriesList";

export const metadata: Metadata = { title: "Webinar series" };

export default function SeriesIndexPage() {
  return (
    <>
      <PageHeader
        title="Webinar series"
        subtitle="Chain webinars into a multi-day journey with sequential unlocks."
      />
      <SeriesList />
    </>
  );
}
