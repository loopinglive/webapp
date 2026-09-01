-- Loopinglive — session scheduling, moved into the database.
--
-- Rolling schedules forward is pure data work: no external call, no payload.
-- Running it as a Postgres job rather than an HTTP cron means it needs no
-- shared secret, survives the web host being down, and is not subject to the
-- once-a-day cron limit on Vercel's Hobby plan.
--
-- These functions are also the single definition of the recurrence rule — the
-- app calls ensure_upcoming_session() rather than reimplementing it.

create extension if not exists pg_cron;

-- ─── When does this schedule next run? ───────────────────────────────────────

create or replace function public.next_occurrence(
  p_scheduled_at timestamptz,
  p_is_recurring boolean,
  p_recurrence_pattern text,
  p_recurrence_time time,
  p_from timestamptz default now()
)
returns timestamptz
language plpgsql
immutable
as $$
declare
  v_days int[];
  v_time time;
  v_naive timestamp;
  i int;
begin
  -- One-off: it runs once, if it has not already passed.
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

  -- recurrence_time wins over the anchor's time of day when it is set.
  v_time := coalesce(p_recurrence_time, (p_scheduled_at at time zone 'UTC')::time);

  -- Walk forward to the next matching weekday. All arithmetic in UTC so the
  -- result does not depend on the connection's timezone setting.
  for i in 0..14 loop
    v_naive := date_trunc('day', (p_from at time zone 'UTC'))
             + make_interval(days => i)
             + v_time;

    if extract(dow from v_naive)::int = any(v_days)
       and (v_naive at time zone 'UTC') > p_from then
      return v_naive at time zone 'UTC';
    end if;
  end loop;

  return null;
end;
$$;

-- ─── Make sure a webinar has its next session on the books ───────────────────

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
  select id
    into v_existing
    from webinar_sessions
   where webinar_id = p_webinar_id
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

  insert into webinar_sessions (webinar_id, schedule_id, starts_at, ends_at, status)
  values (
    p_webinar_id,
    v_best_schedule,
    v_best,
    v_best + make_interval(secs => v_duration),
    'scheduled'
  )
  returning id into v_new;

  return v_new;
end;
$$;

-- ─── The job itself ──────────────────────────────────────────────────────────

create or replace function public.roll_sessions_forward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_live int;
  v_ended int;
  v_retired int;
  v_sessions int := 0;
  w record;
begin
  update webinar_sessions
     set status = 'live'
   where status = 'scheduled'
     and starts_at <= now()
     and ends_at > now();
  get diagnostics v_live = row_count;

  update webinar_sessions
     set status = 'ended'
   where status <> 'ended'
     and ends_at <= now();
  get diagnostics v_ended = row_count;

  -- A one-off whose moment has passed should stop counting toward the publish
  -- checklist.
  update webinar_schedules
     set is_active = false
   where is_recurring = false
     and is_active
     and scheduled_at < now();
  get diagnostics v_retired = row_count;

  for w in
    select id from webinars where status = 'published' and is_active
  loop
    if public.ensure_upcoming_session(w.id) is not null then
      v_sessions := v_sessions + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'live', v_live,
    'ended', v_ended,
    'retired', v_retired,
    'sessions', v_sessions
  );
end;
$$;

-- ─── Permissions ─────────────────────────────────────────────────────────────
-- These run as definer, so they must not be reachable from the anon key.

revoke all on function public.next_occurrence(timestamptz, boolean, text, time, timestamptz) from public, anon, authenticated;
revoke all on function public.ensure_upcoming_session(uuid) from public, anon, authenticated;
revoke all on function public.roll_sessions_forward() from public, anon, authenticated;

grant execute on function public.ensure_upcoming_session(uuid) to service_role;
grant execute on function public.roll_sessions_forward() to service_role;

-- ─── Schedule it ─────────────────────────────────────────────────────────────

do $$
begin
  perform cron.unschedule('loopinglive-roll-sessions')
   where exists (select 1 from cron.job where jobname = 'loopinglive-roll-sessions');
end $$;

select cron.schedule(
  'loopinglive-roll-sessions',
  '*/5 * * * *',
  $$select public.roll_sessions_forward()$$
);
