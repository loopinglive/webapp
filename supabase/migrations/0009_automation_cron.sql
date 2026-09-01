-- Loopinglive — the automation heartbeat.
--
-- The outbox has to be drained every minute for reminders to land on time.
-- Vercel's Hobby plan caps cron jobs at once a day, so this runs from Postgres
-- instead: pg_cron fires, pg_net makes the HTTP call, and the Next.js route
-- does the sending (the Resend and Twilio SDKs live there, not in the database).
--
-- Two settings are required before this does anything. Run them once, replacing
-- the values, then re-run the schedule block below:
--
--   alter database postgres set app.automation_url =
--     'https://webapp-loopinglivecom-5602.vercel.app/api/automation/cron';
--   alter database postgres set app.cron_secret = '<your CRON_SECRET>';

create extension if not exists pg_net;

create or replace function public.tick_automation()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := current_setting('app.automation_url', true);
  v_secret text := current_setting('app.cron_secret', true);
begin
  -- Unconfigured is a no-op rather than an error: a fresh clone of this
  -- database should not fill its logs with failures every minute.
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
end;
$$;

revoke all on function public.tick_automation() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('loopinglive-automation')
   where exists (select 1 from cron.job where jobname = 'loopinglive-automation');
end $$;

select cron.schedule(
  'loopinglive-automation',
  '* * * * *',
  $$select public.tick_automation()$$
);

-- ─── Session end → follow-up ─────────────────────────────────────────────────
-- roll_sessions_forward() marks sessions ended. Something has to notice and
-- schedule the segmented follow-up, so it happens here on the same beat.

create or replace function public.tick_session_endings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := current_setting('app.trigger_url', true);
  v_secret text := current_setting('app.cron_secret', true);
  s record;
  v_count integer := 0;
begin
  if v_url is null or v_secret is null then
    return 0;
  end if;

  -- Sessions that ended in the last 15 minutes and have no follow-up queued.
  for s in
    select ws.id
      from webinar_sessions ws
     where ws.status = 'ended'
       and ws.ends_at > now() - interval '15 minutes'
       and not exists (
         select 1 from scheduled_messages sm
          where sm.session_id = ws.id
            and sm.template_key like 'followup%'
       )
  loop
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-automation-secret', v_secret
      ),
      body := jsonb_build_object('event', 'session_ended', 'sessionId', s.id),
      timeout_milliseconds := 55000
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.tick_session_endings() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('loopinglive-session-endings')
   where exists (select 1 from cron.job where jobname = 'loopinglive-session-endings');
end $$;

select cron.schedule(
  'loopinglive-session-endings',
  '*/2 * * * *',
  $$select public.tick_session_endings()$$
);
