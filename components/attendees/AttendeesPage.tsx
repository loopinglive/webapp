"use client";

import { AttendeeFilters } from "@/components/attendees/AttendeeFilters";
import { AttendeeList } from "@/components/attendees/AttendeeList";
import { AttendeeSegmentTabs } from "@/components/attendees/AttendeeSegmentTabs";
import { AttendeeStats } from "@/components/attendees/AttendeeStats";
import { AdminButton } from "@/components/admin/ui/Field";
import {
  SectionHeader,
  useSetupContext,
} from "@/components/admin/webinar/WebinarSetupShell";
import { useAttendees } from "@/hooks/useAttendees";
import { useSegments } from "@/hooks/useSegments";

export function AttendeesPage({ webinarId }: { webinarId: string }) {
  const { webinar } = useSetupContext();
  const { segments, refetch: refetchSegments } = useSegments(webinarId);
  const list = useAttendees(webinarId);

  const refresh = () => {
    void list.refetch();
    void refetchSegments();
  };

  return (
    <>
      <SectionHeader
        title="Attendees"
        description={`${segments.total.toLocaleString()} registered for this webinar`}
      />

      <div className="space-y-5 px-6 py-6 lg:px-8">
        <AttendeeStats
          segments={segments}
          active={list.segment}
          onSelect={list.setSegment}
        />

        <AttendeeFilters
          webinarId={webinarId}
          segment={list.segment}
          search={list.search}
          onSearchChange={list.setSearch}
          dateFrom={list.dateFrom}
          onDateFromChange={list.setDateFrom}
          dateTo={list.dateTo}
          onDateToChange={list.setDateTo}
        />

        <AttendeeSegmentTabs
          segments={segments}
          active={list.segment}
          onSelect={list.setSegment}
        />

        <AttendeeList
          webinarId={webinarId}
          attendees={list.attendees}
          isLoading={list.isLoading}
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          onSort={list.toggleSort}
          onChanged={refresh}
          videoDurationSeconds={webinar?.video_duration_seconds ?? null}
        />

        {list.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-[#A0A0B0]">
              Page {list.page} of {list.totalPages} · {list.total} attendees
            </span>
            <div className="flex items-center gap-2">
              <AdminButton
                variant="secondary"
                disabled={list.page <= 1}
                onClick={() => list.setPage(list.page - 1)}
              >
                Previous
              </AdminButton>
              <AdminButton
                variant="secondary"
                disabled={list.page >= list.totalPages}
                onClick={() => list.setPage(list.page + 1)}
              >
                Next
              </AdminButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
