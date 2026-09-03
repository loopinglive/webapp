"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";

import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { RecurrenceSelector } from "@/components/admin/schedule/RecurrenceSelector";
import { ScheduleCard } from "@/components/admin/schedule/ScheduleCard";
import { TimezoneSelector } from "@/components/admin/schedule/TimezoneSelector";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { LocalTime } from "@/components/webinar/LocalTime";
import { nextOccurrence, type RecurrenceId } from "@/lib/schedule";
import type { WebinarSchedule, WebinarSession } from "@/types";

export function ScheduleBuilder({ webinarId }: { webinarId: string }) {
  const [schedules, setSchedules] = useState<WebinarSchedule[]>([]);
  const [sessions, setSessions] = useState<WebinarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("20:00");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [recurring, setRecurring] = useState(false);
  const [pattern, setPattern] = useState<RecurrenceId>("daily");
  const [days, setDays] = useState<string[]>(["MON", "WED", "FRI"]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/schedule`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        schedules: WebinarSchedule[];
        sessions: WebinarSession[];
      };
      setSchedules(payload.schedules);
      setSessions(payload.sessions);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const recurrencePattern = recurring
    ? pattern === "weekly"
      ? days.join(",")
      : pattern
    : null;

  // The picker gives us a wall-clock time; the server stores UTC.
  const scheduledAt = date && time ? new Date(`${date}T${time}`).toISOString() : "";

  const preview = scheduledAt
    ? nextOccurrence({
        scheduled_at: scheduledAt,
        is_recurring: recurring,
        recurrence_pattern: recurrencePattern,
        recurrence_time: recurring ? `${time}:00` : null,
      })
    : null;

  async function save() {
    if (!scheduledAt) {
      setError("Pick a date and a time.");
      return;
    }
    if (recurring && pattern === "weekly" && !days.length) {
      setError("Choose at least one day.");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt,
        timezone,
        isRecurring: recurring,
        recurrencePattern,
        recurrenceTime: recurring ? `${time}:00` : null,
      }),
    });

    setSaving(false);

    const payload = (await response.json()) as {
      error?: string;
      warning?: string | null;
    };

    if (!response.ok) {
      setError(payload.error ?? "Could not save that schedule.");
      return;
    }

    // The schedule saved but its first session did not — usually because
    // another session of this webinar already covers that slot. Shown in place
    // rather than swallowed: the host needs to know no session was booked.
    if (payload.warning) setError(payload.warning);

    setAdding(false);
    setDate("");
    await load();
  }

  return (
    <>
      <SectionHeader
        title="Schedule"
        description="When this webinar runs. Attendees always see their own timezone."
        action={
          <AdminButton onClick={() => setAdding((open) => !open)}>
            <CalendarPlus className="h-3.5 w-3.5" />
            {adding ? "Cancel" : "New schedule"}
          </AdminButton>
        }
      />

      <div className="max-w-3xl space-y-6 px-6 py-8 lg:px-8">
        {adding && (
          <section className="rounded-xl border border-[#6C47FF]/30 bg-[#12121A] p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" required>
                <TextInput
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Field>
              <Field label="Time" required>
                <TextInput
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Timezone">
                <TimezoneSelector value={timezone} onChange={setTimezone} />
              </Field>
            </div>

            <div className="mt-4">
              <RecurrenceSelector
                recurring={recurring}
                onRecurringChange={setRecurring}
                pattern={pattern}
                onPatternChange={setPattern}
                days={days}
                onDaysChange={setDays}
              />
            </div>

            {preview && (
              <p className="mt-4 rounded-lg bg-[#6C47FF]/10 px-3.5 py-2.5 text-[12.5px] text-white">
                This webinar will next run{" "}
                <LocalTime iso={preview} className="font-semibold" />
              </p>
            )}

            {error && <p className="mt-3 text-[12.5px] text-[#FF3B3B]">{error}</p>}

            <div className="mt-5">
              <AdminButton onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save schedule
              </AdminButton>
            </div>
          </section>
        )}

        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : schedules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#3A3A4A] px-6 py-14 text-center text-[13.5px] text-[#A0A0B0]">
            No schedules yet. A webinar needs one before it can be published.
          </p>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                webinarId={webinarId}
                schedule={schedule}
                onChanged={load}
              />
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
              Sessions
            </h2>
            <ul className="mt-3 divide-y divide-[#1E1E2E] overflow-hidden rounded-xl border border-[#1E1E2E]">
              {sessions.slice(0, 10).map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-3 bg-[#12121A] px-4 py-3"
                >
                  <LocalTime
                    iso={session.starts_at}
                    className="text-[13px] text-white"
                  />
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[#A0A0B0]">
                    {session.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
