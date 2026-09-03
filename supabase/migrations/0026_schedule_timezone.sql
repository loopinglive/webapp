-- Recurring schedules keep their local time across a clock change.
-- Run after 0025_session_overlap.sql.

/*
 * "8pm every Tuesday" means 8pm where the host is.
 *
 * `webinar_schedules.timezone` has been stored since the first migration and
 * never read. `next_occurrence` did all of its arithmetic in UTC, so
 * `recurrence_time` — a wall-clock time the host typed — was treated as a UTC
 * time. Two failures came out of that, and the second is much worse than the
 * one the engine review predicted:
 *
 *   • A London host's 20:00 ran at 20:00 local in winter and 21:00 in summer.
 *     That is the DST slide, and it is silent: it only shows up as attendees
 *     arriving an hour early twice a year.
 *
 *   • A New York host's 20:00 ran at 15:00 local in winter and 16:00 in
 *     summer. Wrong by hours, permanently, for every host outside UTC.
 *
 * Measured against production before changing anything: next_occurrence(…,
 * '20:00', from 2026-07-01) returned 20:00Z, which is 16:00 in New York.
 *
 * The fix is to do the arithmetic in the schedule's own zone. Postgres already
 * carries the tz database, so `timestamp at time zone 'Europe/London'` gives
 * the right instant on both sides of a transition.
 */
create or replace function public.next_occurrence(
  p_scheduled_at timestamptz,
  p_is_recurring boolean,
  p_recurrence_pattern text,
  p_recurrence_time time,
  p_from timestamptz default now(),
  /*
   * Defaulted so the existing four- and five-argument calls keep working and
   * keep their old behaviour, rather than silently changing meaning. Callers
   * that know the zone pass it.
   */
  p_timezone text default 'UTC'
)
returns timestamptz
language plpgsql
stable
as $$
declare
  v_days int[];
  v_time time;
  v_naive timestamp;
  v_zone text;
  i int;
begin
  -- One-off: it runs once, if it has not already passed. An absolute instant
  -- was chosen when it was saved, so no zone arithmetic applies.
  if not coalesce(p_is_recurring, false) then
    if p_scheduled_at > p_from then
      return p_scheduled_at;
    end if;
    return null;
  end if;

  if p_recurrence_pattern is null then
    return null;
  elsif p_recurrence_pattern = 'daily' then
    v_days := array[0,1,2,3,4,5,6];
  elsif p_recurrence_pattern = 'weekdays' then
    v_days := array[1,2,3,4,5];
  else
    -- 'MON,WED,FRI' → day-of-week numbers, Sunday = 0.
    select array_agg(idx) into v_days
    from (
      select array_position(
               array['SUN','MON','TUE','WED','THU','FRI','SAT'],
               trim(upper(code))
             ) - 1 as idx
      from unnest(string_to_array(p_recurrence_pattern, ',')) as code
    ) t
    where idx is not null;
  end if;

  if v_days is null or array_length(v_days, 1) is null then
    return null;
  end if;

  /*
   * An unknown zone name must not take the scheduler down — it runs for every
   * published webinar in one loop, and one bad row would stop the rest.
   */
  begin
    perform now() at time zone coalesce(p_timezone, 'UTC');
    v_zone := coalesce(p_timezone, 'UTC');
  exception
    when others then
      v_zone := 'UTC';
  end;

  -- recurrence_time wins over the anchor's time of day when it is set. The
  -- anchor's fallback is read in the schedule's zone for the same reason.
  v_time := coalesce(p_recurrence_time, (p_scheduled_at at time zone v_zone)::time);

  /*
   * Walk forward day by day in the schedule's own zone.
   *
   * The weekday test also has to happen there: 8pm Tuesday in New York is
   * Wednesday 01:00 UTC, so a UTC weekday check would run it on the wrong day.
   */
  for i in 0..14 loop
    v_naive := date_trunc('day', (p_from at time zone v_zone))
             + make_interval(days => i)
             + v_time;

    if extract(dow from v_naive)::int = any(v_days)
       and (v_naive at time zone v_zone) > p_from then
      return v_naive at time zone v_zone;
    end if;
  end loop;

  return null;
end;
$$;

/* The scheduler passes the zone. Otherwise identical to 0025's version. */
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
      v_schedule.recurrence_time,
      now(),
      v_schedule.timezone
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

revoke all on function public.next_occurrence(timestamptz, boolean, text, time, timestamptz, text)
  from public, anon, authenticated;
revoke all on function public.ensure_upcoming_session(uuid) from public, anon, authenticated;
grant execute on function public.ensure_upcoming_session(uuid) to service_role;
