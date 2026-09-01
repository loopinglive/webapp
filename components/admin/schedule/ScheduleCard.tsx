"use client";

import { useState } from "react";
import { Globe, Repeat, Trash2 } from "lucide-react";

import { LocalTime } from "@/components/webinar/LocalTime";
import { describeRecurrence, nextOccurrence } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { WebinarSchedule } from "@/types";

export function ScheduleCard({
  webinarId,
  schedule,
  onChanged,
}: {
  webinarId: string;
  schedule: WebinarSchedule;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const next = nextOccurrence(schedule);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/webinar/${webinarId}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId: schedule.id, isActive: !schedule.is_active }),
    });
    setBusy(false);
    onChanged();
  }

  async function remove() {
    setBusy(true);
    await fetch(
      `/api/admin/webinar/${webinarId}/schedule?scheduleId=${schedule.id}`,
      { method: "DELETE" }
    );
    setBusy(false);
    onChanged();
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5",
        !schedule.is_active && "opacity-55"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-white">
          {next ? (
            <LocalTime iso={next} />
          ) : (
            <span className="text-[#A0A0B0]">No upcoming run</span>
          )}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#A0A0B0]">
          <span className="flex items-center gap-1">
            <Repeat className="h-3 w-3" />
            {describeRecurrence(schedule)}
          </span>
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {schedule.timezone}
          </span>
        </p>
      </div>

      <button
        onClick={toggle}
        disabled={busy}
        aria-label={schedule.is_active ? "Disable schedule" : "Enable schedule"}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          schedule.is_active ? "bg-[#00C851]" : "bg-[#3A3A4A]"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300",
            schedule.is_active ? "left-6" : "left-1"
          )}
        />
      </button>

      <button
        onClick={remove}
        disabled={busy}
        aria-label="Delete schedule"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#A0A0B0] transition-colors hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
