-- Daily AI insights sweep.
-- Run after 0038_score_attendees_cron.sql.

create or replace function public.tick_generate_insights()
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
    url := v_url || '/api/cron/generate-insights',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 270000
  );
end;
$$;

revoke all on function public.tick_generate_insights() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('loopinglive-generate-insights')
   where exists (select 1 from cron.job where jobname = 'loopinglive-generate-insights');
end $$;

/* 3am -- after the 2am scoring sweep, so insights about hot leads read the fresh scores. */
select cron.schedule(
  'loopinglive-generate-insights',
  '0 3 * * *',
  $$select public.tick_generate_insights()$$
);
