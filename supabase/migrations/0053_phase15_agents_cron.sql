-- Autonomous follow-up agents: dispatch tick every 15 minutes.
-- Run after 0052_phase15_translation_webinar_scope.sql.

create or replace function public.tick_dispatch_agents()
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
    url := v_url || '/api/agents/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke all on function public.tick_dispatch_agents() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('loopinglive-dispatch-agents')
   where exists (select 1 from cron.job where jobname = 'loopinglive-dispatch-agents');
end $$;

select cron.schedule(
  'loopinglive-dispatch-agents',
  '*/15 * * * *',
  $$select public.tick_dispatch_agents()$$
);
