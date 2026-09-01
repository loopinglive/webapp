-- Loopinglive — Phase 6: analytics
-- Run after 0011_re_engagement_cron.sql.

-- ─── Revenue ─────────────────────────────────────────────────────────────────
-- `registrants.bought` is a boolean, which is why revenue cannot be reported.
-- Every purchase now carries an amount, a currency and a provenance.

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete set null,
  registrant_id uuid references registrants(id) on delete cascade,
  offer_id uuid references webinar_offers(id) on delete set null,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  source text not null default 'manual', -- 'manual' | 'internal' | 'stripe'
  external_reference text,
  created_at timestamptz default now(),
  -- One purchase per person per offer. Re-marking someone as bought must not
  -- double the revenue.
  unique (registrant_id, offer_id)
);

-- ─── Session shape over time ─────────────────────────────────────────────────
-- Live viewer count is computed on demand and thrown away. Snapshots make the
-- curve reconstructable for sessions nobody was watching. Keyed on video offset
-- so it lines up with every other per-session chart.

create table if not exists session_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  captured_at timestamptz default now(),
  video_offset_seconds integer not null,
  viewers integer default 0,
  real_viewers integer default 0,
  chat_messages integer default 0,
  unique (session_id, video_offset_seconds)
);

-- ─── Rollups ─────────────────────────────────────────────────────────────────

create table if not exists webinar_daily_stats (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  day date not null,
  registrations integer default 0,
  attendees integer default 0,
  no_shows integer default 0,
  avg_watch_percentage numeric(5,2) default 0,
  avg_watch_seconds integer default 0,
  offer_clicks integer default 0,
  purchases integer default 0,
  revenue_cents integer default 0,
  computed_at timestamptz default now(),
  unique (webinar_id, day)
);

create table if not exists platform_daily_stats (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  webinars_total integer default 0,
  webinars_published integer default 0,
  registrations integer default 0,
  attendees integer default 0,
  purchases integer default 0,
  revenue_cents integer default 0,
  emails_sent integer default 0,
  sms_sent integer default 0,
  whatsapp_sent integer default 0,
  new_hosts integer default 0,
  computed_at timestamptz default now()
);

-- ─── Capture columns ─────────────────────────────────────────────────────────

alter table registrants
  add column if not exists device_type text,   -- 'mobile' | 'tablet' | 'desktop'
  add column if not exists browser text,
  add column if not exists os text,
  -- Geo-IP. Deliberately separate from country_code, which is the country they
  -- picked for their phone number and means something different.
  add column if not exists ip_country text;

alter table webinar_offers
  add column if not exists price_cents integer default 0,
  add column if not exists currency text default 'USD';

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists purchases_webinar_idx on purchases (webinar_id, created_at desc);
create index if not exists purchases_registrant_idx on purchases (registrant_id);
create index if not exists session_snapshots_session_idx
  on session_snapshots (session_id, video_offset_seconds);
create index if not exists webinar_daily_stats_lookup_idx
  on webinar_daily_stats (webinar_id, day desc);
create index if not exists registrants_device_idx
  on registrants (webinar_id, device_type) where device_type is not null;
-- Drives every "what happened on day X" aggregate.
create index if not exists attendee_events_type_day_idx
  on attendee_events (event_type, created_at);

-- ─── Row level security ──────────────────────────────────────────────────────
-- Host-scoped and revenue-bearing. Served only through admin routes on the
-- service role; no anon or authenticated policies.

alter table purchases enable row level security;
alter table session_snapshots enable row level security;
alter table webinar_daily_stats enable row level security;
alter table platform_daily_stats enable row level security;
