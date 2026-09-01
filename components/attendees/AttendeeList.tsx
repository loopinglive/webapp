"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Users } from "lucide-react";

import { ManualBoughtToggle } from "@/components/attendees/ManualBoughtToggle";
import { SegmentBadge } from "@/components/attendees/SegmentBadge";
import { WatchDepthBar } from "@/components/attendees/WatchDepthBar";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { AttendeeListItem } from "@/types";

const COLUMNS: { id: string; label: string; sortable?: boolean }[] = [
  { id: "full_name", label: "Name", sortable: true },
  { id: "email", label: "Email", sortable: true },
  { id: "phone", label: "Phone" },
  { id: "created_at", label: "Registered", sortable: true },
  { id: "last_attended_at", label: "Last attended", sortable: true },
  { id: "watch_percentage", label: "Watch depth", sortable: true },
  { id: "clicked_offer", label: "Offer", sortable: true },
  { id: "bought", label: "Bought", sortable: true },
  { id: "segment", label: "Segment" },
];

export function AttendeeList({
  webinarId,
  attendees,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onChanged,
  videoDurationSeconds,
}: {
  webinarId: string;
  attendees: AttendeeListItem[];
  isLoading: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;
  onChanged: () => void;
  videoDurationSeconds: number | null;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="grid place-items-center rounded-xl border border-[#1E1E2E] py-20">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (!attendees.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#3A3A4A] px-6 py-20 text-center">
        <Users className="mx-auto h-6 w-6 text-[#3A3A4A]" />
        <p className="mt-3 text-[13.5px] text-[#A0A0B0]">
          No attendees in this segment yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#1E1E2E]">
      <table className="w-full min-w-[980px]">
        <thead>
          <tr className="border-b border-[#1E1E2E] bg-[#12121A] text-left">
            {COLUMNS.map((column) => (
              <th
                key={column.id}
                className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]"
              >
                {column.sortable ? (
                  <button
                    onClick={() => onSort(column.id)}
                    className="flex items-center gap-1 transition-colors hover:text-white"
                  >
                    {column.label}
                    {sortBy === column.id &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="h-2.5 w-2.5" />
                      ) : (
                        <ArrowDown className="h-2.5 w-2.5" />
                      ))}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-[#1E1E2E]">
          {attendees.map((attendee) => (
            <tr
              key={attendee.id}
              onClick={() =>
                router.push(
                  `/admin/webinar/${webinarId}/attendees/${attendee.id}`
                )
              }
              className="cursor-pointer bg-[#0D0D17] transition-colors hover:bg-[#12121A]"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/admin/webinar/${webinarId}/attendees/${attendee.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-center gap-2.5"
                >
                  <Avatar name={attendee.full_name} size={26} />
                  <span className="truncate text-[13px] font-medium text-white">
                    {attendee.full_name}
                  </span>
                  {attendee.returning_attendee && (
                    <span
                      title="Returning attendee"
                      className="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-[#A0A0B0]"
                    >
                      ↻
                    </span>
                  )}
                </Link>
              </td>

              <td className="max-w-[200px] truncate px-4 py-2.5 text-[12.5px] text-[#A0A0B0]">
                {attendee.email}
              </td>

              <td className="px-4 py-2.5 text-[12.5px] text-[#A0A0B0]">
                <span className="mr-1.5">{attendee.country_flag}</span>
                {attendee.phone}
              </td>

              <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-[#A0A0B0]">
                {new Date(attendee.created_at).toLocaleDateString()}
              </td>

              <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-[#A0A0B0]">
                {attendee.last_attended_at
                  ? new Date(attendee.last_attended_at).toLocaleDateString()
                  : "Never"}
              </td>

              <td className="w-[150px] px-4 py-2.5">
                <WatchDepthBar
                  percentage={Number(attendee.watch_percentage)}
                  watchSeconds={attendee.watch_seconds}
                  totalSeconds={videoDurationSeconds}
                />
              </td>

              <td className="px-4 py-2.5 text-center text-[13px]">
                <span
                  className={cn(
                    attendee.clicked_offer ? "text-[#FFD93D]" : "text-[#3A3A4A]"
                  )}
                >
                  {attendee.clicked_offer ? "✓" : "—"}
                </span>
              </td>

              <td
                className="px-4 py-2.5"
                onClick={(event) => event.stopPropagation()}
              >
                <ManualBoughtToggle
                  registrantId={attendee.id}
                  name={attendee.full_name}
                  bought={attendee.bought}
                  onChanged={onChanged}
                  compact
                />
              </td>

              <td className="px-4 py-2.5">
                <SegmentBadge segment={attendee.segment} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
