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
 * Recurring schedules keep `scheduled_at` as the anchor for the time of day and
 * walk forward from now to the next matching weekday.
 */
export function nextOccurrence(
  schedule: Pick<
    WebinarSchedule,
    "scheduled_at" | "is_recurring" | "recurrence_pattern" | "recurrence_time"
  >,
  from: Date = new Date()
): string | null {
  const anchor = new Date(schedule.scheduled_at);

  if (!schedule.is_recurring) {
    return anchor.getTime() > from.getTime() ? anchor.toISOString() : null;
  }

  const days = daysFor(schedule.recurrence_pattern);
  if (!days.length) return null;

  // recurrence_time ("20:00:00") wins over the anchor's time of day when set.
  const [hours, minutes] = (
    schedule.recurrence_time ??
    `${anchor.getUTCHours()}:${anchor.getUTCMinutes()}`
  )
    .split(":")
    .map(Number);

  for (let offset = 0; offset <= 14; offset += 1) {
    const candidate = new Date(from);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    candidate.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0);

    if (!days.includes(candidate.getUTCDay())) continue;
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
