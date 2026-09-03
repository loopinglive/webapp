-- Phase 8 — integrations, outbound webhooks, public API.
-- Run after 0014_phase7_billing.sql.

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  provider text not null,
  status text default 'connected',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  api_key text,
  account_name text,
  account_id text,
  settings jsonb default '{}',
  last_error text,
  connected_at timestamptz default now(),
  last_synced_at timestamptz,
  unique(user_id, provider)
);

create table if not exists webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete cascade,
  url text not null,
  description text,
  secret text not null default replace(gen_random_uuid()::text, '-', ''),
  events jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists webhook_endpoints_user_idx
  on webhook_endpoints(user_id) where is_active;

create table if not exists webhook_logs (
  id uuid primary key default gen_random_uuid(),
  webhook_endpoint_id uuid references webhook_endpoints(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  response_status integer,
  response_body text,
  error_message text,
  attempt_count integer default 1,
  status text default 'pending',
  next_retry_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- The retry sweep queries exactly this shape, so it gets its own partial index.
create index if not exists webhook_logs_retry_idx
  on webhook_logs(next_retry_at)
  where status = 'failed';

create index if not exists webhook_logs_endpoint_idx
  on webhook_logs(webhook_endpoint_id, created_at desc);

/*
 * API keys are stored as a SHA-256 hash, not bcrypt.
 *
 * Deliberate departure from the usual password advice. A password is
 * low-entropy and needs a slow hash to resist offline cracking; an API key is
 * 256 bits of CSPRNG output, so there is nothing to crack. What matters here
 * is that verification is a single indexed lookup — with bcrypt the server
 * would have to fetch every active key and compare against each one, which is
 * O(n) slow hashes on every authenticated request and gets worse as the
 * product grows.
 */
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists api_keys_user_idx on api_keys(user_id);

create table if not exists onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade unique,
  steps_completed jsonb default '[]',
  current_step text default 'create_webinar',
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete set null,
  error_type text not null,
  error_message text not null,
  stack_trace text,
  page_url text,
  user_agent text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists error_logs_created_idx on error_logs(created_at desc);

-- ─────────────────────────── RLS ───────────────────────────
-- Everything here is per-user and reached through the service role in API
-- routes. The policies exist so that a leaked anon key reads nothing.
alter table integrations enable row level security;
alter table webhook_endpoints enable row level security;
alter table webhook_logs enable row level security;
alter table api_keys enable row level security;
alter table onboarding_progress enable row level security;
alter table error_logs enable row level security;

drop policy if exists "own integrations" on integrations;
create policy "own integrations" on integrations
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own webhook endpoints" on webhook_endpoints;
create policy "own webhook endpoints" on webhook_endpoints
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own webhook logs" on webhook_logs;
create policy "own webhook logs" on webhook_logs
  for select to authenticated using (
    webhook_endpoint_id in (
      select id from webhook_endpoints where user_id = auth.uid()
    )
  );

-- Note there is no policy exposing key_hash: even the owner reads their keys
-- through the API route, which selects only the prefix and metadata.
drop policy if exists "own onboarding" on onboarding_progress;
create policy "own onboarding" on onboarding_progress
  for select to authenticated using (user_id = auth.uid());

-- ─────────────── webhook retry sweep (pg_cron) ───────────────
/*
 * Retries live in Postgres rather than a Vercel cron.
 *
 * Vercel's Hobby plan caps cron jobs at once per day, which is useless for a
 * five-minute retry sweep — the same constraint that moved session rolling and
 * automation dispatch into pg_cron in earlier phases. This marks the rows due
 * for retry; the API route does the actual sending.
 */
create or replace function public.tick_webhook_retries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_count integer := 0;
begin
  select value into v_url from app_config where key = 'site_url';
  select value into v_secret from app_config where key = 'cron_secret';

  if v_url is null or v_secret is null then
    return 0;
  end if;

  select count(*) into v_count
    from webhook_logs
   where status = 'failed'
     and attempt_count < 5
     and next_retry_at is not null
     and next_retry_at <= now();

  if v_count = 0 then
    return 0;
  end if;

  perform net.http_post(
    url := v_url || '/api/webhooks/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );

  return v_count;
end;
$$;

revoke all on function public.tick_webhook_retries() from public, anon, authenticated;

select cron.unschedule('loopinglive-webhook-retries')
  where exists (
    select 1 from cron.job where jobname = 'loopinglive-webhook-retries'
  );

select cron.schedule(
  'loopinglive-webhook-retries',
  '*/5 * * * *',
  $$select public.tick_webhook_retries()$$
);

-- ─────────── composite indexes from the Phase 9 perf pass ───────────
create index if not exists live_chat_messages_session_sent_idx
  on live_chat_messages(session_id, sent_at);
create index if not exists registrants_webinar_email_idx
  on registrants(webinar_id, email);
create index if not exists scheduled_messages_status_due_idx
  on scheduled_messages(status, scheduled_for);
create index if not exists timed_comments_webinar_offset_idx
  on timed_comments(webinar_id, video_offset_seconds);
