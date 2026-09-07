-- Hourly platform health metrics snapshot.
-- Run after 0039_generate_insights_cron.sql.

create or replace function public.tick_record_health_metrics()
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
    url := v_url || '/api/cron/record-health-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end;
$$;

revoke all on function public.tick_record_health_metrics() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('loopinglive-record-health-metrics')
   where exists (select 1 from cron.job where jobname = 'loopinglive-record-health-metrics');
end $$;

/* Hourly -- frequent enough to catch a decline within the day, cheap enough not to matter. */
select cron.schedule(
  'loopinglive-record-health-metrics',
  '0 * * * *',
  $$select public.tick_record_health_metrics()$$
);
