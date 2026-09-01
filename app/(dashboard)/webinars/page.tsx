import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Webinars" };

export default function WebinarsPage() {
  return (
    <>
      <PageHeader
        title="Webinars"
        subtitle="Recordings, schedules, personas, and timed triggers."
        action={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New webinar
          </Button>
        }
      />
      <div className="px-6 py-8 lg:px-10">
        <EmptyState
          title="Nothing scheduled"
          body="Create a webinar to upload a recording, add personas, and place your offer on the timeline."
          action={<Button>Create webinar</Button>}
        />
      </div>
    </>
  );
}
