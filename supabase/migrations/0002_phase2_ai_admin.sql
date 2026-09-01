-- Loopinglive — Phase 2: AI persona replies + admin live panel
-- Run after 0001_phase1_schema.sql.

-- ─── New tables ──────────────────────────────────────────────────────────────

create table if not exists ai_personas (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  persona_name text not null,
  avatar_url text,
  personality_brief text not null,
  reply_to_real_users boolean default true,
  fake_comment_reply_percentage integer default 50,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists ai_replies (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  original_message_id uuid references live_chat_messages(id) on delete cascade,
  ai_persona_id uuid references ai_personas(id),
  persona_name text not null,
  persona_avatar text,
  content text not null,
  is_human_override boolean default false,
  sent_at timestamptz default now()
);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  webinar_session_id uuid references webinar_sessions(id) on delete cascade,
  admin_id uuid references auth.users(id),
  joined_at timestamptz default now(),
  left_at timestamptz
);

create table if not exists persona_mode (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  ai_persona_id uuid references ai_personas(id) on delete cascade,
  mode text default 'ai',
  updated_at timestamptz default now(),
  unique (session_id, ai_persona_id)
);

-- ─── live_chat_messages additions ────────────────────────────────────────────

alter table live_chat_messages
  add column if not exists has_ai_reply boolean default false,
  add column if not exists ai_reply_pending boolean default false,
  add column if not exists reply_to_message_id uuid references live_chat_messages(id),
  -- Not in the base spec, but the reply claim needs a clock: a serverless
  -- function that dies mid-generation would otherwise leave a message pending
  -- forever. A claim older than the retry window can be taken over.
  add column if not exists ai_reply_claimed_at timestamptz;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists ai_personas_webinar_idx on ai_personas (webinar_id);
create index if not exists ai_replies_session_idx on ai_replies (session_id);
create index if not exists ai_replies_original_message_idx
  on ai_replies (original_message_id);
create index if not exists persona_mode_session_idx on persona_mode (session_id);
create index if not exists admin_sessions_webinar_session_idx
  on admin_sessions (webinar_session_id);
create index if not exists live_chat_messages_reply_to_idx
  on live_chat_messages (reply_to_message_id);
-- Drives the "unanswered real users" filter.
create index if not exists live_chat_messages_pending_idx
  on live_chat_messages (session_id, has_ai_reply)
  where is_real_user;

-- ─── Row level security ──────────────────────────────────────────────────────
-- Viewers get nothing from these tables. Everything a viewer sees still arrives
-- through live_chat_messages, which is already public to read. Persona briefs,
-- reply bookkeeping, and admin presence stay server-side.

alter table ai_personas enable row level security;
alter table ai_replies enable row level security;
alter table admin_sessions enable row level security;
alter table persona_mode enable row level security;

-- The admin panel subscribes to persona_mode over Realtime, which needs a read
-- path for a signed-in user. Writes still go through the service role.
drop policy if exists "persona mode readable by authenticated" on persona_mode;
create policy "persona mode readable by authenticated" on persona_mode
  for select to authenticated using (true);

drop policy if exists "ai personas readable by authenticated" on ai_personas;
create policy "ai personas readable by authenticated" on ai_personas
  for select to authenticated using (true);

-- ─── Realtime ────────────────────────────────────────────────────────────────

do $$
begin
  alter publication supabase_realtime add table persona_mode;
exception
  when duplicate_object then null;
end $$;
