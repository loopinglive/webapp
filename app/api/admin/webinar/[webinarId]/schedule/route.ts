import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { nextOccurrence } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const [{ data: schedules, error }, { data: sessions }] = await Promise.all([
    supabase
      .from("webinar_schedules")
      .select("*")
      .eq("webinar_id", webinarId)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("webinar_sessions")
      .select("*")
      .eq("webinar_id", webinarId)
      .order("starts_at", { ascending: false })
      .limit(50),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedules: schedules ?? [], sessions: sessions ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const body = (await request.json()) as {
    scheduledAt?: string;
    timezone?: string;
    isRecurring?: boolean;
    recurrencePattern?: string | null;
    recurrenceTime?: string | null;
  };

  if (!body.scheduledAt || !body.timezone) {
    return NextResponse.json(
      { error: "A date, time and timezone are required." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: schedule, error } = await supabase
    .from("webinar_schedules")
    .insert({
      webinar_id: webinarId,
      scheduled_at: body.scheduledAt,
      timezone: body.timezone,
      is_recurring: Boolean(body.isRecurring),
      recurrence_pattern: body.recurrencePattern ?? null,
      recurrence_time: body.recurrenceTime ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Materialise the first session so the room has something to point at.
  const { data: webinar } = await supabase
    .from("webinars")
    .select("video_duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  const startsAt = nextOccurrence(schedule);
  let warning: string | null = null;

  if (startsAt) {
    const duration = webinar?.video_duration_seconds ?? 0;
    const { error: sessionError } = await supabase
      .from("webinar_sessions")
      .insert({
        webinar_id: webinarId,
        schedule_id: schedule.id,
        starts_at: startsAt,
        ends_at: new Date(
          new Date(startsAt).getTime() + duration * 1000
        ).toISOString(),
        status: "scheduled",
      });

    /*
     * The database refuses two sessions of one webinar that run at the same
     * time — overlap splits the room and the analytics between them.
     *
     * Reported as a warning rather than an error: the schedule itself saved,
     * and it may well be the earlier one the host wants to remove. Telling
     * them the rule and letting them decide beats rolling back a change they
     * asked for.
     */
    if (sessionError) {
      warning =
        sessionError.code === "23P01"
          ? "Saved, but no session was booked — another session of this webinar already runs at that time. Two overlapping sessions would split your attendees between them."
          : `Saved, but the first session could not be booked: ${sessionError.message}`;
    }
  }

  return NextResponse.json({ schedule, warning });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { scheduleId, isActive } = (await request.json()) as {
    scheduleId?: string;
    isActive?: boolean;
  };

  if (!scheduleId || typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "scheduleId and isActive are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("webinar_schedules")
    .update({ is_active: isActive })
    .eq("id", scheduleId)
    .eq("webinar_id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const scheduleId = new URL(request.url).searchParams.get("scheduleId");

  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("webinar_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("webinar_id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
