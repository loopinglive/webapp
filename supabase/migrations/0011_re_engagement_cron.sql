-- Loopinglive — the re-engagement sweep.
--
-- Hourly, not per-minute: re-engagement is measured in days, so scanning every
-- registrant sixty times an hour would be waste. The endpoint is idempotent —
-- it only queues what is actually due — so an occasional missed hour is
-- harmless.

create or replace function public.tick_re_engagement()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := public.config('re_engagement_url');
  v_secret text := public.config('cron_secret');
begin
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

revoke all on function public.tick_re_engagement() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('loopinglive-re-engagement')
   where exists (select 1 from cron.job where jobname = 'loopinglive-re-engagement');
end $$;

select cron.schedule(
  'loopinglive-re-engagement',
  '7 * * * *',
  $$select public.tick_re_engagement()$$
);
