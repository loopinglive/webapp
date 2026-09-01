-- Loopinglive — Phase 3: admin webinar setup
-- Run after 0003_offers.sql.

-- ─── webinars: setup + AI context columns ────────────────────────────────────

alter table webinars
  add column if not exists topic text,
  add column if not exists offer_description text,
  add column if not exists webinar_context text,
  add column if not exists key_talking_points text,
  add column if not exists objection_notes text,
  add column if not exists thumbnail_url text,
  add column if not exists status text default 'draft',
  add column if not exists total_views integer default 0,
  add column if not exists clone_of uuid references webinars(id),
  -- Phase 1 made video_url NOT NULL, but a draft exists before its video does.
  alter column video_url drop not null,
  alter column video_duration_seconds drop not null;

alter table webinars
  add column if not exists video_public_id text;

-- ─── webinar_offers: superseded shape ────────────────────────────────────────
-- 0003 created a minimal version to close the Phase 1 offer-zone gap. Phase 3
-- specifies the full shape, so the table is rebuilt rather than patched — the
-- only rows are the seed fixture, which seed.sql recreates.

drop table if exists webinar_offers cascade;

create table webinar_offers (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  offer_title text not null,
  offer_description text,
  button_text text not null default 'Grab The Offer Now',
  button_colour text not null default '#6C47FF',
  button_animation text default 'pulse', -- 'pulse' | 'glow' | 'slide' | 'bounce'
  trigger_video_offset_seconds integer not null,
  countdown_enabled boolean default false,
  countdown_minutes integer default 30,
  opens_in text default 'modal', -- 'modal' | 'new_tab'
  offer_type text not null, -- 'external' | 'internal'
  external_url text,
  internal_page_content jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists webinar_offers_webinar_idx
  on webinar_offers (webinar_id, trigger_video_offset_seconds);

-- ─── Timed engagement ────────────────────────────────────────────────────────

create table if not exists timed_polls (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  question text not null,
  options jsonb not null,
  video_offset_seconds integer not null,
  duration_seconds integer default 30,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists timed_handouts (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  title text not null,
  file_url text not null,
  video_offset_seconds integer not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists timed_ctas (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  button_text text not null,
  button_url text not null,
  button_colour text default '#6C47FF',
  video_offset_seconds integer not null,
  duration_seconds integer default 60,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists timed_pinned_messages (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  content text not null,
  video_offset_seconds integer not null,
  duration_seconds integer default 60,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists timed_polls_webinar_idx
  on timed_polls (webinar_id, video_offset_seconds);
create index if not exists timed_handouts_webinar_idx
  on timed_handouts (webinar_id, video_offset_seconds);
create index if not exists timed_ctas_webinar_idx
  on timed_ctas (webinar_id, video_offset_seconds);
create index if not exists timed_pinned_messages_webinar_idx
  on timed_pinned_messages (webinar_id, video_offset_seconds);

-- Rule: one persona cannot say two things at the same instant. Different
-- personas at the same second are fine, which is why the key includes persona.
create unique index if not exists timed_comments_persona_offset_key
  on timed_comments (persona_id, video_offset_seconds);

-- ─── Row level security ──────────────────────────────────────────────────────
-- The room needs to read these; only the service role writes them.

alter table webinar_offers enable row level security;
alter table timed_polls enable row level security;
alter table timed_handouts enable row level security;
alter table timed_ctas enable row level security;
alter table timed_pinned_messages enable row level security;

drop policy if exists "offers are public" on webinar_offers;
create policy "offers are public" on webinar_offers for select using (is_active);

drop policy if exists "polls are public" on timed_polls;
create policy "polls are public" on timed_polls for select using (is_active);

drop policy if exists "handouts are public" on timed_handouts;
create policy "handouts are public" on timed_handouts for select using (is_active);

drop policy if exists "ctas are public" on timed_ctas;
create policy "ctas are public" on timed_ctas for select using (is_active);

drop policy if exists "pinned messages are public" on timed_pinned_messages;
create policy "pinned messages are public" on timed_pinned_messages
  for select using (is_active);

-- Phase 1 exposed only active webinars. Drafts stay invisible to the room.
drop policy if exists "active webinars are public" on webinars;
create policy "active webinars are public" on webinars
  for select using (is_active and status = 'published');
