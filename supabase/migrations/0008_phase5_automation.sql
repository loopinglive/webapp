-- Loopinglive — Phase 5: follow-up automation
-- Run after 0007_session_scheduler.sql.

-- ─── Templates ───────────────────────────────────────────────────────────────

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  template_key text not null,
  trigger_type text not null,     -- 'pre' | 'post' | 're_engagement' | 'buyer'
  segment text,
  channel text not null,          -- 'email' | 'sms' | 'whatsapp'
  subject text,
  body text not null,
  delay_hours numeric default 0,
  delay_unit text default 'hours',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (webinar_id, template_key, channel)
);

-- ─── The outbox ──────────────────────────────────────────────────────────────

create table if not exists scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete set null,
  template_id uuid references message_templates(id) on delete set null,
  template_key text,
  channel text not null,
  recipient_email text,
  recipient_phone text,
  recipient_name text,
  subject text,
  body text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  -- pending | sent | failed | failed_permanently | cancelled
  status text default 'pending',
  attempts integer default 0,
  error_message text,
  provider_message_id text,
  created_at timestamptz default now(),
  -- One of each template per registrant per session. Re-running a trigger, or
  -- two requests racing, cannot double-send.
  unique (registrant_id, session_id, template_key, channel)
);

create table if not exists message_logs (
  id uuid primary key default gen_random_uuid(),
  scheduled_message_id uuid references scheduled_messages(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  channel text not null,
  status text not null,
  provider_response jsonb,
  sent_at timestamptz default now()
);

-- ─── Replay ──────────────────────────────────────────────────────────────────

create table if not exists replay_access (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  access_token text not null unique default gen_random_uuid()::text,
  expires_at timestamptz not null,
  first_accessed_at timestamptz,
  last_accessed_at timestamptz,
  watch_seconds integer default 0,
  watch_percentage numeric(5,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (registrant_id, session_id)
);

-- ─── Settings and opt-outs ───────────────────────────────────────────────────

create table if not exists automation_settings (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade unique,
  email_enabled boolean default true,
  sms_enabled boolean default false,
  whatsapp_enabled boolean default false,
  replay_enabled boolean default true,
  replay_duration_hours integer default 48,
  re_engagement_enabled boolean default true,
  re_engagement_delay_days integer default 30,
  re_engagement_frequency_days integer default 7,
  max_re_engagement_messages integer default 8,
  unsubscribe_enabled boolean default true,
  from_name text default 'Loopinglive',
  from_email text default 'noreply@loopinglive.com',
  reply_to_email text,
  sms_sender_id text,
  whatsapp_sender_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists unsubscribes (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid references registrants(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete cascade,
  channel text not null,
  unsubscribed_at timestamptz default now(),
  unique (registrant_id, webinar_id, channel)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- The dispatcher's only query: what is due right now?
create index if not exists scheduled_messages_due_idx
  on scheduled_messages (scheduled_for)
  where status = 'pending';

create index if not exists scheduled_messages_registrant_idx
  on scheduled_messages (registrant_id, status);
create index if not exists scheduled_messages_webinar_idx
  on scheduled_messages (webinar_id, status, scheduled_for desc);
create index if not exists message_templates_webinar_idx
  on message_templates (webinar_id, template_key);
create index if not exists message_logs_registrant_idx
  on message_logs (registrant_id, sent_at desc);
create index if not exists replay_access_token_idx on replay_access (access_token);
create index if not exists unsubscribes_lookup_idx
  on unsubscribes (registrant_id, webinar_id, channel);

-- ─── Row level security ──────────────────────────────────────────────────────
-- Everything here is either PII-adjacent (who was messaged, what was said) or
-- host configuration. All of it is served through server routes on the service
-- role; none of it gets an anon policy.

alter table message_templates enable row level security;
alter table scheduled_messages enable row level security;
alter table message_logs enable row level security;
alter table replay_access enable row level security;
alter table automation_settings enable row level security;
alter table unsubscribes enable row level security;
