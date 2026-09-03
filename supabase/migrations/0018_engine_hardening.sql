-- Engine hardening.
-- Run after 0017_phase10_live_mode.sql.

/*
 * Pre-flight check on upcoming sessions.
 *
 * A session that goes live with a broken video fails in front of everyone who
 * turned up, and nobody finds out until they complain. This fires every ten
 * minutes and the route HEAD-requests each video due within the next 90.
 */
create or replace function public.tick_preflight()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_due integer := 0;
begin
  select value into v_url from app_config where key = 'site_url';
  select value into v_secret from app_config where key = 'cron_secret';
  if v_url is null or v_secret is null then
    return 0;
  end if;

  select count(*) into v_due
    from webinar_sessions
   where status = 'scheduled'
     and starts_at between now() and now() + interval '90 minutes';

  if v_due = 0 then
    return 0;
  end if;

  perform net.http_post(
    url := v_url || '/api/cron/preflight',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );

  return v_due;
end;
$$;

revoke all on function public.tick_preflight() from public, anon, authenticated;

select cron.unschedule('loopinglive-preflight')
  where exists (select 1 from cron.job where jobname = 'loopinglive-preflight');

select cron.schedule(
  'loopinglive-preflight',
  '*/10 * * * *',
  $$select public.tick_preflight()$$
);

/*
 * Overlap protection.
 *
 * Two sessions of the same webinar running at once would split the audience
 * and the analytics, with no way to tell which room is the real one.
 */
create unique index if not exists webinar_sessions_one_live_idx
  on webinar_sessions(webinar_id)
  where status = 'live';

-- ─────────────── handout downloads ───────────────
-- A download is a strong buying signal, and nothing was recording it.
create table if not exists handout_downloads (
  id uuid primary key default gen_random_uuid(),
  handout_id uuid references timed_handouts(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete set null,
  video_offset_seconds integer,
  created_at timestamptz default now(),
  unique(handout_id, registrant_id)
);

create index if not exists handout_downloads_handout_idx
  on handout_downloads(handout_id);

alter table handout_downloads enable row level security;

-- ─────────────── disclosure setting ───────────────
/*
 * Lets a host label a session honestly.
 *
 * Some sell into regulated niches and will need this; the format's disclosure
 * position has not been assessed by anyone qualified, and offering the option
 * costs nothing.
 */
alter table webinars
  add column if not exists broadcast_label text default 'live',
  -- live | encore | replay | recorded
  add column if not exists show_recorded_notice boolean default false;

-- ─────────────── duplicate registrations ───────────────
/*
 * One person per webinar.
 *
 * The same address registering twice was two attendees, two reminder
 * sequences and two rows in every metric. Partial so historical duplicates,
 * if any exist, do not block the migration -- the app upserts on this from now
 * on.
 */
create unique index if not exists registrants_one_per_webinar_idx
  on registrants(webinar_id, lower(email));
