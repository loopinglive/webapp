-- Test sessions: a run that does not count.
-- Run after 0021_admin_roles.sql.

/*
 * A host cannot currently see what they built before real people do.
 *
 * The obvious implementation — a "preview mode" that fakes a session and
 * suppresses every write — means every path in the room needs a branch, and
 * the thing the host is checking is precisely whether those paths work. So a
 * preview is a real session instead. Chat persists, personas post, timed
 * comments fire, the offer appears, exactly as they will on the night.
 *
 * What makes it a preview is that it is marked, and the two places where a
 * marked session would do harm — analytics and automated messaging — skip it.
 */
alter table webinar_sessions
  add column if not exists is_test boolean not null default false;

/*
 * Test sessions are excluded from most reads, so the index is on the
 * complement: the real sessions of one webinar, in time order.
 */
create index if not exists webinar_sessions_real_idx
  on webinar_sessions (webinar_id, starts_at)
  where not is_test;

/*
 * Registrants created for a test run.
 *
 * Marked rather than deleted afterwards: a host may leave the tab open, and a
 * row that vanishes underneath a live page is worse than one that lingers.
 * The nightly sweep below clears them out.
 */
alter table registrants
  add column if not exists is_test boolean not null default false;

create index if not exists registrants_test_idx on registrants (is_test)
  where is_test;

/*
 * Clears out test runs after a day.
 *
 * A host previews, closes the tab, and never thinks about it again. Without
 * this, every preview is a session row and a registrant row forever, and the
 * schedule screen slowly fills with sessions nobody scheduled.
 */
create or replace function public.purge_test_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from registrants
   where is_test and created_at < now() - interval '24 hours';

  delete from webinar_sessions
   where is_test and starts_at < now() - interval '24 hours';

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_test_sessions() from public;
grant execute on function public.purge_test_sessions() to service_role;

/* Once a day is often enough for cleanup nobody is waiting on. */
select cron.schedule(
  'purge-test-sessions',
  '30 4 * * *',
  $$select public.purge_test_sessions();$$
)
where not exists (
  select 1 from cron.job where jobname = 'purge-test-sessions'
);

/*
 * The scheduler has to ignore test runs.
 *
 * `ensure_upcoming_session` returns early when a session already exists that
 * is still running or yet to start. A test run started ten seconds ago
 * satisfies that check, so previewing a webinar would quietly stop the real
 * schedule from rolling forward — the failure would show up hours later as a
 * webinar that did not run, with nothing to connect it to the preview.
 *
 * Only the existence check changes. Everything else is 0007 verbatim.
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

revoke all on function public.ensure_upcoming_session(uuid) from public, anon, authenticated;
grant execute on function public.ensure_upcoming_session(uuid) to service_role;
