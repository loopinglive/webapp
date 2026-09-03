-- Phase 10 — live webinar mode.
-- Run after 0016_admin_observability.sql.

/*
 * A live broadcast.
 *
 * Separate from webinar_sessions because the lifecycles differ: a scheduled
 * session is either upcoming, playing or over, whereas a broadcast spends time
 * backstage before anyone sees it and spends time processing after everyone
 * has left. Conflating them would put "processing" into the state machine that
 * drives the attendee's watch room.
 */
create table if not exists live_sessions (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete set null,
  host_id uuid references user_accounts(id) on delete set null,
  room_name text not null unique,
  status text not null default 'backstage',
  title text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  peak_viewers integer default 0,
  egress_id text,
  recording_url text,
  recording_public_id text,
  recording_error text,
  converted_webinar_id uuid references webinars(id) on delete set null,
  converted_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists live_sessions_webinar_idx
  on live_sessions(webinar_id, created_at desc);

-- At most one broadcast in flight per webinar. Two live rooms for the same
-- webinar would split the audience with no way to tell which is real.
create unique index if not exists live_sessions_one_active_idx
  on live_sessions(webinar_id)
  where status in ('backstage', 'live');

/*
 * What was on screen, and when.
 *
 * The reason this exists is conversion: a timed comment written against the
 * recording needs to know that minutes 12–18 were a pre-recorded clip rather
 * than the host talking.
 */
create table if not exists live_segments (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid references live_sessions(id) on delete cascade,
  kind text not null,
  source_url text,
  label text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  offset_seconds integer default 0
);

create index if not exists live_segments_session_idx
  on live_segments(live_session_id, offset_seconds);

create table if not exists live_questions (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid references live_sessions(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete set null,
  author_name text not null,
  question text not null,
  status text default 'pending',
  is_featured boolean default false,
  upvotes integer default 0,
  answered_at timestamptz,
  video_offset_seconds integer,
  created_at timestamptz default now()
);

create index if not exists live_questions_session_idx
  on live_questions(live_session_id, created_at desc);

-- One vote per person, so the count means something.
create table if not exists live_question_votes (
  question_id uuid references live_questions(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (question_id, registrant_id)
);

-- Keeps the denormalised count honest without a round trip from the client.
create or replace function public.sync_question_upvotes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update live_questions
     set upvotes = (
       select count(*) from live_question_votes
        where question_id = coalesce(new.question_id, old.question_id)
     )
   where id = coalesce(new.question_id, old.question_id);
  return null;
end;
$$;

drop trigger if exists live_question_votes_sync on live_question_votes;
create trigger live_question_votes_sync
  after insert or delete on live_question_votes
  for each row execute function public.sync_question_upvotes();

-- ─────────────────────────── RLS ───────────────────────────
alter table live_sessions enable row level security;
alter table live_segments enable row level security;
alter table live_questions enable row level security;
alter table live_question_votes enable row level security;

-- Attendees are anonymous and need to see the broadcast state and the Q&A
-- they are participating in. Neither exposes anything private: a live session
-- row is the room's public state, and a question is written to be read out.
drop policy if exists "live sessions are readable" on live_sessions;
create policy "live sessions are readable" on live_sessions
  for select to anon, authenticated using (status in ('live', 'ended'));

drop policy if exists "questions are readable" on live_questions;
create policy "questions are readable" on live_questions
  for select to anon, authenticated using (status <> 'dismissed');

-- Writes go through the service role in API routes, which is where the
-- registrant is verified against the session.

-- Realtime, so the host panel and the attendee banner both react without
-- polling. Chat already rides this publication from Phase 1.
do $$
begin
  begin
    alter publication supabase_realtime add table live_questions;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table live_sessions;
  exception when duplicate_object then null;
  end;
end $$;
