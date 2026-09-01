-- Loopinglive — Phase 4: registration page builder + attendee tracking
-- Run after 0005_poll_responses.sql.

-- ─── Registration page config ────────────────────────────────────────────────

create table if not exists registration_page_config (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade unique,
  logo_url text,
  hero_image_url text,
  background_type text default 'gradient',
  background_value text default 'linear-gradient(135deg, #0A0A0F 0%, #1A0A2E 100%)',
  primary_colour text default '#6C47FF',
  secondary_colour text default '#00D4FF',
  headline text not null default 'Join Our Live Webinar',
  subheadline text,
  host_name text,
  host_title text,
  host_avatar_url text,
  what_you_will_learn jsonb default '[]',
  social_proof_count integer default 0,
  social_proof_label text default 'people have already registered',
  show_attendee_count boolean default true,
  show_session_time boolean default true,
  cta_button_text text default 'Reserve My Spot →',
  thank_you_headline text default 'You are registered!',
  thank_you_subheadline text default 'Check your email for the webinar details.',
  thank_you_redirect_url text,
  show_add_to_calendar boolean default true,
  show_social_share boolean default true,
  custom_fields jsonb default '[]',
  facebook_pixel_id text,
  fb_track_pageview boolean default true,
  fb_track_lead boolean default true,
  google_analytics_id text,
  ga_track_conversion boolean default true,
  custom_domain text,
  custom_domain_status text default 'not_connected',
  custom_css text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Attendee tracking ───────────────────────────────────────────────────────

create table if not exists attendee_sources (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid references registrants(id) on delete cascade,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer_url text,
  landing_page_url text,
  created_at timestamptz default now()
);

create table if not exists attendee_events (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid references registrants(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete set null,
  event_type text not null,
  event_data jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists attendee_segments (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  segment text not null,
  assigned_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (webinar_id, registrant_id)
);

-- ─── registrants additions ───────────────────────────────────────────────────

alter table registrants
  add column if not exists watch_depth_segment text default 'none',
  add column if not exists total_sessions_attended integer default 0,
  add column if not exists last_attended_at timestamptz,
  add column if not exists offer_clicked_at timestamptz,
  add column if not exists bought_at timestamptz,
  add column if not exists manually_marked_bought boolean default false,
  add column if not exists returning_attendee boolean default false,
  add column if not exists history_cleared_at timestamptz,
  add column if not exists notes text,
  add column if not exists tags jsonb default '[]';

-- A milestone fires once per attendee per session, so the timeline cannot fill
-- with duplicates when the progress tick repeats a threshold.
create unique index if not exists attendee_events_milestone_key
  on attendee_events (registrant_id, session_id, event_type, (event_data->>'percent'))
  where event_type = 'watch_milestone';

create index if not exists attendee_events_registrant_idx
  on attendee_events (registrant_id, created_at);
create index if not exists attendee_sources_registrant_idx
  on attendee_sources (registrant_id);
create index if not exists attendee_segments_webinar_idx
  on attendee_segments (webinar_id, segment);
create index if not exists registrants_webinar_created_idx
  on registrants (webinar_id, created_at desc);

-- ─── Row level security ──────────────────────────────────────────────────────

alter table registration_page_config enable row level security;
alter table attendee_sources enable row level security;
alter table attendee_events enable row level security;
alter table attendee_segments enable row level security;

-- The registration page is public, so its styling has to be readable by anon.
-- Nothing here is sensitive: colours, copy, and the pixel ids that would be
-- visible in the page source anyway.
drop policy if exists "registration config is public" on registration_page_config;
create policy "registration config is public" on registration_page_config
  for select using (is_active);

-- Sources, events and segments are attendee behaviour tied to a person. No anon
-- policy: they are served only through admin routes on the service role.
