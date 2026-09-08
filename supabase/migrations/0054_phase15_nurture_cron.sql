-- Predictive nurture: dispatch due touchpoints every two hours.
-- Run after 0053_phase15_agents_cron.sql.
--
-- Two-hourly rather than per-minute on purpose: a touchpoint is scheduled to
-- the hour a lead actually engages at, so it needs to land in the right part
-- of their day, not the right second.

create or replace function public.tick_dispatch_nurture()
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
    url := v_url || '/api/nurture/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke all on function public.tick_dispatch_nurture() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('loopinglive-dispatch-nurture')
   where exists (select 1 from cron.job where jobname = 'loopinglive-dispatch-nurture');
end $$;

select cron.schedule(
  'loopinglive-dispatch-nurture',
  '0 */2 * * *',
  $$select public.tick_dispatch_nurture()$$
);
