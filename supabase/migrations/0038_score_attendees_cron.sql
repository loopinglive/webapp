-- Daily attendee scoring sweep.
-- Run after 0037_enterprise_leads.sql.

/*
 * Vercel Hobby caps crons at once a day, so every scheduled job in this
 * product runs from pg_cron, not vercel.json — the pattern already
 * established for re-engagement and the session scheduler.
 */
create or replace function public.tick_score_attendees()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := public.config('site_url');
  v_secret text := public.config('cron_secret');
begin
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/api/cron/score-attendees',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    -- Can touch every active registrant across every recent webinar; the
    -- route itself is capped at maxDuration 300, matched here with headroom.
    timeout_milliseconds := 290000
  );
end;
$$;

revoke all on function public.tick_score_attendees() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('loopinglive-score-attendees')
   where exists (select 1 from cron.job where jobname = 'loopinglive-score-attendees');
end $$;

/* 2am, off the hour crons run on, so it is not competing with them. */
select cron.schedule(
  'loopinglive-score-attendees',
  '0 2 * * *',
  $$select public.tick_score_attendees()$$
);
