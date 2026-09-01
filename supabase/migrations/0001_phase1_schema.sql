-- Loopinglive — Phase 1: core webinar room
-- Run in the Supabase SQL editor, or `supabase db push`.

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists webinars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  title text not null,
  description text,
  video_url text not null,
  video_duration_seconds integer not null,
  thumbnail_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists webinar_schedules (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  scheduled_at timestamptz not null,
  timezone text not null default 'UTC',
  is_recurring boolean default false,
  recurrence_pattern text, -- 'daily', 'weekly', 'weekdays', or 'MON,WED,FRI'
  recurrence_time time,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists webinar_sessions (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  schedule_id uuid references webinar_schedules(id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text default 'scheduled', -- 'scheduled' | 'live' | 'ended'
  created_at timestamptz default now()
);

create table if not exists fake_personas (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  name text not null,
  avatar_url text,
  location text,
  created_at timestamptz default now()
);

create table if not exists timed_comments (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  persona_id uuid references fake_personas(id) on delete cascade,
  content text not null,
  video_offset_seconds integer not null,
  created_at timestamptz default now()
);

create table if not exists registrants (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  session_id uuid references webinar_sessions(id),
  full_name text not null,
  email text not null,
  phone text not null,
  country_code text not null,
  country_flag text not null,
  attended boolean default false,
  joined_at timestamptz,
  left_at timestamptz,
  watch_seconds integer default 0,
  watch_percentage numeric(5,2) default 0,
  clicked_offer boolean default false,
  bought boolean default false,
  created_at timestamptz default now()
);

create table if not exists live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  sender_name text not null,
  sender_avatar text,
  sender_location text,
  is_fake boolean default false,
  is_real_user boolean default false,
  registrant_id uuid references registrants(id),
  persona_id uuid references fake_personas(id),
  -- Added beyond the base spec: lets persona drops be inserted exactly once per
  -- session no matter how many viewers cross the timestamp simultaneously.
  timed_comment_id uuid references timed_comments(id) on delete cascade,
  content text not null,
  sent_at timestamptz default now(),
  -- One row per (session, scripted comment) no matter how many viewers cross the
  -- timestamp at once. NULLs never collide, so real user messages are unaffected.
  constraint live_chat_messages_session_timed_comment_key
    unique (session_id, timed_comment_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists webinar_sessions_webinar_starts_idx
  on webinar_sessions (webinar_id, starts_at);
create index if not exists timed_comments_webinar_offset_idx
  on timed_comments (webinar_id, video_offset_seconds);
create index if not exists live_chat_messages_session_sent_idx
  on live_chat_messages (session_id, sent_at);
create index if not exists registrants_session_idx on registrants (session_id);
create index if not exists registrants_webinar_email_idx on registrants (webinar_id, email);
create index if not exists fake_personas_webinar_idx on fake_personas (webinar_id);

-- ─── Row level security ──────────────────────────────────────────────────────
-- Attendees are anonymous, so the anon role gets read access to everything that
-- makes up the room. Writes always go through API routes on the service role.

alter table webinars enable row level security;
alter table webinar_schedules enable row level security;
alter table webinar_sessions enable row level security;
alter table fake_personas enable row level security;
alter table timed_comments enable row level security;
alter table registrants enable row level security;
alter table live_chat_messages enable row level security;

drop policy if exists "active webinars are public" on webinars;
create policy "active webinars are public" on webinars
  for select using (is_active);

drop policy if exists "schedules are public" on webinar_schedules;
create policy "schedules are public" on webinar_schedules
  for select using (true);

drop policy if exists "sessions are public" on webinar_sessions;
create policy "sessions are public" on webinar_sessions
  for select using (true);

drop policy if exists "personas are public" on fake_personas;
create policy "personas are public" on fake_personas
  for select using (true);

drop policy if exists "timed comments are public" on timed_comments;
create policy "timed comments are public" on timed_comments
  for select using (true);

-- Chat is public to read (this is what Realtime delivers to viewers) but only
-- the service role may write, so nobody can spoof a persona from the console.
drop policy if exists "chat is public to read" on live_chat_messages;
create policy "chat is public to read" on live_chat_messages
  for select using (true);

-- registrants holds email + phone. No anon policy at all: PII never leaves the
-- server. The waiting room's social proof is served pre-filtered by an API route.

-- ─── Realtime ────────────────────────────────────────────────────────────────

do $$
begin
  alter publication supabase_realtime add table live_chat_messages;
exception
  when duplicate_object then null;
end $$;
