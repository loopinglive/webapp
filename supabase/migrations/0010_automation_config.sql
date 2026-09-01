-- Loopinglive — configuration for the database-side jobs.
--
-- 0009 read the endpoint and secret from database GUCs, which needs privileges
-- the Supabase pooler role does not have. A table works, is writable by the
-- service role, and is visible when you need to check what the job is calling.

create table if not exists app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table app_config enable row level security;
-- Holds the cron secret. Service role only; no anon or authenticated policy.

create or replace function public.config(p_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from app_config where key = p_key;
$$;

revoke all on function public.config(text) from public, anon, authenticated;

-- ─── Rewire the jobs onto the table ──────────────────────────────────────────

create or replace function public.tick_automation()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := public.config('automation_url');
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

create or replace function public.tick_session_endings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := public.config('trigger_url');
  v_secret text := public.config('cron_secret');
  s record;
  v_count integer := 0;
begin
  if v_url is null or v_secret is null then
    return 0;
  end if;

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

revoke all on function public.tick_automation() from public, anon, authenticated;
revoke all on function public.tick_session_endings() from public, anon, authenticated;
