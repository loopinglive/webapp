-- Two sessions of one webinar must not run at the same time.
-- Run after 0024_attendance_reconcile.sql.

/*
 * Overlap splits the room.
 *
 * Half the attendees land in one session and half in the other, so the chat
 * each half sees is missing the other half's messages, the viewer count is
 * wrong in both, and the analytics for the night are two partial rows that
 * neither adds up nor obviously looks broken.
 *
 * The ways it can happen are all plausible: two schedules on the same webinar
 * whose times drift into each other, a host adding a one-off inside a
 * recurring slot, or the same webinar being lengthened after its sessions were
 * booked at the old duration.
 *
 * Enforced in the database rather than checked in the application, because the
 * sessions table is written from three places — the scheduler function, the
 * schedule route, and the lazy path a viewer triggers — and a check in one of
 * them is a check in none.
 */

/* Needed to mix uuid equality with range overlap in one exclusion constraint. */
create extension if not exists btree_gist;

/*
 * Test runs are exempt.
 *
 * A host previewing at 7:55 for a webinar that goes out at 8:00 is doing
 * exactly what the feature is for, and refusing it would make previewing
 * impossible in the hour when a host most wants to preview.
 */
do $$
begin
  alter table webinar_sessions
    add constraint webinar_sessions_no_overlap
    exclude using gist (
      webinar_id with =,
      tstzrange(starts_at, coalesce(ends_at, starts_at), '[)') with &&
    )
    where (not is_test);
exception
  -- Already applied.
  when duplicate_object then null;
  when duplicate_table then null;
end $$;

/*
 * Reports overlaps rather than assuming there are none.
 *
 * If the constraint above could not be created because data already violates
 * it, this is how a host finds out which sessions to fix. It stays useful
 * afterwards for the same question asked about a schedule being edited.
 */
create or replace function public.overlapping_sessions(p_webinar_id uuid)
returns table (
  first_id uuid,
  first_starts timestamptz,
  second_id uuid,
  second_starts timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.starts_at, b.id, b.starts_at
    from webinar_sessions a
    join webinar_sessions b
      on a.webinar_id = b.webinar_id
     and a.id < b.id
     and tstzrange(a.starts_at, coalesce(a.ends_at, a.starts_at), '[)')
      && tstzrange(b.starts_at, coalesce(b.ends_at, b.starts_at), '[)')
   where a.webinar_id = p_webinar_id
     and not a.is_test
     and not b.is_test
   order by a.starts_at;
$$;

revoke all on function public.overlapping_sessions(uuid) from public, anon;
grant execute on function public.overlapping_sessions(uuid) to authenticated, service_role;

/*
 * The scheduler must not raise.
 *
 * `ensure_upcoming_session` is called from the public session route — the one
 * an attendee hits when they open the watch page. With the constraint in
 * place, a webinar whose schedules overlap would make that insert throw, and
 * the attendee would get a 500 for a misconfiguration that is not theirs and
 * that they cannot do anything about.
 *
 * So the insert is guarded: on a conflict, return the session already
 * occupying that slot. The room stays up, the host still has an overlap to
 * fix, and `overlapping_sessions()` is how they find it.
 *
 * Otherwise identical to 0022's version.
 */
create or replace function public.ensure_upcoming_session(p_webinar_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int;
  v_existing uuid;
  v_schedule record;
  v_starts timestamptz;
  v_best timestamptz;
  v_best_schedule uuid;
  v_new uuid;
begin
  select coalesce(video_duration_seconds, 0)
    into v_duration
    from webinars
   where id = p_webinar_id;

  if not found then
    return null;
  end if;

  -- Anything still running, or yet to start, means there is nothing to do.
  -- A test run is neither: it is the host looking at their own work.
  select id
    into v_existing
    from webinar_sessions
   where webinar_id = p_webinar_id
     and not is_test
     and starts_at >= now() - make_interval(secs => v_duration)
   order by starts_at
   limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  -- Whichever active schedule comes round first wins.
  for v_schedule in
    select * from webinar_schedules
     where webinar_id = p_webinar_id and is_active
  loop
    v_starts := public.next_occurrence(
      v_schedule.scheduled_at,
      v_schedule.is_recurring,
      v_schedule.recurrence_pattern,
      v_schedule.recurrence_time
    );

    if v_starts is not null and (v_best is null or v_starts < v_best) then
      v_best := v_starts;
      v_best_schedule := v_schedule.id;
    end if;
  end loop;

  if v_best is null then
    return null;
  end if;

  begin
    insert into webinar_sessions (webinar_id, schedule_id, starts_at, ends_at, status)
    values (
      p_webinar_id,
      v_best_schedule,
      v_best,
      v_best + make_interval(secs => v_duration),
      'scheduled'
    )
    returning id into v_new;
  exception
    when exclusion_violation then
      -- Another schedule already covers that slot. Hand back what is there.
      select id
        into v_new
        from webinar_sessions
       where webinar_id = p_webinar_id
         and not is_test
         and tstzrange(starts_at, coalesce(ends_at, starts_at), '[)')
          && tstzrange(v_best, v_best + make_interval(secs => v_duration), '[)')
       order by starts_at
       limit 1;
  end;

  return v_new;
end;
$$;

revoke all on function public.ensure_upcoming_session(uuid) from public, anon, authenticated;
grant execute on function public.ensure_upcoming_session(uuid) to service_role;
