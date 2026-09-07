-- Weekly SOC2 evidence collection.
-- Run after 0047_phase14_kenya_kes.sql.

create or replace function public.tick_collect_soc2_evidence()
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
    url := v_url || '/api/soc2/collect-evidence',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end;
$$;

revoke all on function public.tick_collect_soc2_evidence() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('loopinglive-collect-soc2-evidence')
   where exists (select 1 from cron.job where jobname = 'loopinglive-collect-soc2-evidence');
end $$;

/* Monday 03:00 UTC -- a weekly cadence is enough for evidence that changes slowly. */
select cron.schedule(
  'loopinglive-collect-soc2-evidence',
  '0 3 * * 1',
  $$select public.tick_collect_soc2_evidence()$$
);
