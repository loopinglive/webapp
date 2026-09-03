import {
  zonedWallClockToInstant,
  zonedDateString,
  zonedWeekday,
} from "@/lib/timezone";
import type { WebinarSchedule } from "@/types";

export const WEEKDAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export const RECURRENCE_PRESETS = [
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays (Mon–Fri)" },
  { id: "weekly", label: "Specific days" },
] as const;

export type RecurrenceId = (typeof RECURRENCE_PRESETS)[number]["id"];

function daysFor(pattern: string | null): number[] {
  if (!pattern) return [];
  if (pattern === "daily") return [0, 1, 2, 3, 4, 5, 6];
  if (pattern === "weekdays") return [1, 2, 3, 4, 5];
  // 'MON,WED,FRI'
  return pattern
    .split(",")
    .map((code) => WEEKDAY_CODES.indexOf(code.trim().toUpperCase()))
    .filter((index) => index >= 0);
}

/**
 * The next time this schedule should run, as an ISO string, or null when it is
 * a one-off that has already passed.
 *
 * DISPLAY ONLY. The authoritative version is public.next_occurrence() in
 * 0007_session_scheduler.sql — that is what actually creates sessions. This
 * mirror exists because the schedule builder previews a rule the host has not
 * saved yet, so there is no row for the database to reason about. The two are
 * kept in step deliberately; change one, change the other.
 */
export function nextOccurrence(
  schedule: Pick<
    WebinarSchedule,
    | "scheduled_at"
    | "is_recurring"
    | "recurrence_pattern"
    | "recurrence_time"
    | "timezone"
  >,
  from: Date = new Date()
): string | null {
  const anchor = new Date(schedule.scheduled_at);

  if (!schedule.is_recurring) {
    return anchor.getTime() > from.getTime() ? anchor.toISOString() : null;
  }

  const days = daysFor(schedule.recurrence_pattern);
  if (!days.length) return null;

  const zone = schedule.timezone || "UTC";

  // recurrence_time ("20:00:00") wins over the anchor's time of day when set.
  // The fallback is read in the schedule's zone, not the viewer's.
  const time =
    schedule.recurrence_time ??
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).format(anchor);

  /*
   * Walk forward a day at a time, on the calendar in the schedule's own zone.
   *
   * Stepping by 86,400,000ms would be wrong: on the day a clock changes, a
   * fixed 24 hours from 23:00 lands at 00:00 the day *after* next, so the
   * transition day is skipped entirely. This walks calendar dates instead,
   * which is what "every day" means, and matches what the SQL does with
   * `date_trunc('day', …) + make_interval(days => i)`.
   *
   * The weekday test has to happen in the zone too: 8pm Tuesday in New York is
   * Wednesday 01:00 UTC, so testing the UTC weekday would run it a day late.
   */
  const [startYear, startMonth, startDay] = zonedDateString(from, zone)
    .split("-")
    .map(Number);

  for (let offset = 0; offset <= 14; offset += 1) {
    // Date arithmetic on the calendar date alone — no zone, so no transition
    // to fall into. Month rollover is handled by Date itself.
    const walked = new Date(
      Date.UTC(startYear ?? 1970, (startMonth ?? 1) - 1, (startDay ?? 1) + offset)
    );
    const day = walked.toISOString().slice(0, 10);

    const candidate = zonedWallClockToInstant(day, time, zone);

    if (!days.includes(zonedWeekday(candidate, zone))) continue;
    if (candidate.getTime() <= from.getTime()) continue;

    return candidate.toISOString();
  }

  return null;
}

export function describeRecurrence(
  schedule: Pick<WebinarSchedule, "is_recurring" | "recurrence_pattern">
) {
  if (!schedule.is_recurring) return "One time";
  const pattern = schedule.recurrence_pattern;
  if (pattern === "daily") return "Every day";
  if (pattern === "weekdays") return "Weekdays";
  if (!pattern) return "Recurring";
  return pattern
    .split(",")
    .map((code) => code.trim().slice(0, 1) + code.trim().slice(1, 3).toLowerCase())
    .join(", ");
}

/** IANA zones, with the browser's own first so it is one click away. */
export function timezoneList() {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC"];

  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return [local, "UTC", ...supported.filter((zone) => zone !== local && zone !== "UTC")];
}
