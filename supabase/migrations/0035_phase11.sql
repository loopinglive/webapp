-- Loopinglive — Phase 11: white label, series, on-demand, certificates,
-- exit surveys, private messaging, raise hand, AI persona generation,
-- multi-language, upsell automation, Cele.bio integration.
-- Run after 0034_fraud_signals_fix.sql.

-- ─── White label ──────────────────────────────────────────────────────────
create table if not exists white_label_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade unique,
  brand_name text not null,
  brand_logo_url text,
  brand_favicon_url text,
  primary_colour text default '#6C47FF',
  secondary_colour text default '#00D4FF',
  background_colour text default '#0A0A0F',
  custom_domain text unique,
  custom_domain_verified boolean default false,
  hide_loopinglive_branding boolean default true,
  custom_login_page_headline text,
  custom_login_page_subheadline text,
  custom_support_email text,
  custom_terms_url text,
  custom_privacy_url text,
  email_from_name text,
  email_from_address text,
  smtp_host text,
  smtp_port integer,
  smtp_username text,
  -- Encrypted at rest by the application (pgcrypto symmetric, keyed off
  -- SUPABASE_SERVICE_ROLE_KEY-derived secret) before this column is written —
  -- never a plaintext credential in the database.
  smtp_password_encrypted text,
  use_custom_smtp boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists white_label_configs_domain_idx
  on white_label_configs (custom_domain) where custom_domain is not null;

alter table white_label_configs enable row level security;
-- Service role only, same as every other admin-owned config table.

-- ─── Webinar series ───────────────────────────────────────────────────────
create table if not exists webinar_series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references user_accounts(id) on delete cascade,
  title text not null,
  description text,
  thumbnail_url text,
  is_sequential boolean default true,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists webinar_series_items (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references webinar_series(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete cascade,
  position integer not null,
  unlock_after_days integer default 0,
  unlock_after_completion boolean default false,
  created_at timestamptz default now(),
  unique(series_id, webinar_id),
  unique(series_id, position)
);

create table if not exists series_progress (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references webinar_series(id) on delete cascade,
  registrant_email text not null,
  current_webinar_id uuid references webinars(id),
  completed_webinar_ids jsonb default '[]',
  started_at timestamptz default now(),
  last_activity_at timestamptz default now(),
  unique(series_id, registrant_email)
);

create index if not exists webinar_series_items_series_idx on webinar_series_items (series_id, position);
create index if not exists series_progress_series_idx on series_progress (series_id);

alter table webinar_series enable row level security;
alter table webinar_series_items enable row level security;
alter table series_progress enable row level security;

-- ─── On-demand mode ───────────────────────────────────────────────────────
create table if not exists on_demand_access (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  access_token text not null unique default gen_random_uuid()::text,
  expires_at timestamptz,
  first_accessed_at timestamptz,
  last_accessed_at timestamptz,
  watch_seconds integer default 0,
  watch_percentage numeric(5,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(webinar_id, registrant_id)
);

create index if not exists on_demand_access_token_idx on on_demand_access (access_token);

alter table on_demand_access enable row level security;

-- ─── Certificates ─────────────────────────────────────────────────────────
create table if not exists certificate_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  name text not null,
  design jsonb not null default '{}',
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  certificate_number text not null unique,
  issued_at timestamptz default now(),
  download_url text,
  template_id text default 'default',
  unique(webinar_id, registrant_id)
);

create index if not exists certificates_number_idx on certificates (certificate_number);

alter table certificate_templates enable row level security;
alter table certificates enable row level security;

-- ─── Exit survey ──────────────────────────────────────────────────────────
create table if not exists exit_surveys (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade unique,
  title text default 'Quick Question Before You Go',
  questions jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists exit_survey_responses (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  session_id uuid references webinar_sessions(id),
  responses jsonb not null,
  submitted_at timestamptz default now()
);

create index if not exists exit_survey_responses_webinar_idx on exit_survey_responses (webinar_id);
-- One response per registrant per session — resubmission overwrites rather
-- than piling up duplicate rows for the same exit.
create unique index if not exists exit_survey_responses_unique_idx
  on exit_survey_responses (webinar_id, registrant_id, coalesce(session_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table exit_surveys enable row level security;
alter table exit_survey_responses enable row level security;

-- ─── Private messaging + raise hand ───────────────────────────────────────
create table if not exists private_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  sender_type text not null check (sender_type in ('attendee', 'host')),
  content text not null,
  is_read boolean default false,
  read_at timestamptz,
  sent_at timestamptz default now()
);

create index if not exists private_messages_session_registrant_idx
  on private_messages (session_id, registrant_id, sent_at);

create table if not exists raised_hands (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  raised_at timestamptz default now(),
  lowered_at timestamptz,
  acknowledged_at timestamptz,
  unique(session_id, registrant_id)
);

create index if not exists raised_hands_session_idx on raised_hands (session_id) where lowered_at is null;

alter table private_messages enable row level security;
alter table raised_hands enable row level security;

-- Realtime needs these on the publication, same as chat_messages.
alter publication supabase_realtime add table private_messages;
alter publication supabase_realtime add table raised_hands;

-- ─── AI-generated personas ────────────────────────────────────────────────
create table if not exists ai_generated_personas (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  generation_prompt text,
  generated_count integer not null,
  niche text,
  locations jsonb default '[]',
  status text default 'pending',
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table ai_generated_personas enable row level security;

-- ─── Upsell automation ────────────────────────────────────────────────────
create table if not exists upsell_sequences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references user_accounts(id) on delete cascade,
  source_webinar_id uuid references webinars(id) on delete cascade,
  target_webinar_id uuid references webinars(id) on delete cascade,
  delay_days integer default 30,
  is_active boolean default true,
  email_subject text,
  email_body text,
  sms_body text,
  whatsapp_body text,
  created_at timestamptz default now(),
  unique(source_webinar_id, target_webinar_id)
);

create index if not exists upsell_sequences_source_idx on upsell_sequences (source_webinar_id) where is_active;

alter table upsell_sequences enable row level security;

-- ─── Cele.bio integration ─────────────────────────────────────────────────
create table if not exists cele_bio_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade unique,
  cele_bio_user_id text not null,
  cele_bio_username text not null,
  -- Encrypted at rest, same scheme as the SMTP password above.
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  auto_sync_enabled boolean default true,
  show_on_profile boolean default true,
  use_cele_bio_payments boolean default false,
  connected_at timestamptz default now(),
  last_synced_at timestamptz
);

create table if not exists cele_bio_synced_webinars (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references cele_bio_connections(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete cascade,
  cele_bio_product_id text,
  synced_at timestamptz default now(),
  unique(connection_id, webinar_id)
);

alter table cele_bio_connections enable row level security;
alter table cele_bio_synced_webinars enable row level security;

-- ─── Multi-language ───────────────────────────────────────────────────────
create table if not exists webinar_translations (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  language_code text not null,
  title text,
  description text,
  registration_headline text,
  registration_subheadline text,
  what_you_will_learn jsonb default '[]',
  cta_button_text text,
  auto_translated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(webinar_id, language_code)
);

alter table webinar_translations enable row level security;

-- ─── Updates to existing tables ───────────────────────────────────────────
alter table webinars
  add column if not exists mode text default 'scheduled' check (mode in ('scheduled', 'on_demand', 'both')),
  add column if not exists on_demand_enabled boolean default false,
  add column if not exists on_demand_expires_hours integer default 0,
  add column if not exists on_demand_allow_seek boolean default false,
  add column if not exists certificate_enabled boolean default false,
  add column if not exists certificate_min_watch_percentage numeric(5,2) default 90,
  add column if not exists certificate_template_id uuid references certificate_templates(id) on delete set null,
  add column if not exists exit_survey_enabled boolean default false,
  add column if not exists private_messaging_enabled boolean default false,
  add column if not exists raise_hand_enabled boolean default false,
  add column if not exists series_id uuid references webinar_series(id) on delete set null,
  add column if not exists primary_language text default 'en',
  add column if not exists supported_languages jsonb default '["en"]',
  add column if not exists host_name text;

alter table registrants
  add column if not exists upsell_eligible boolean default false,
  add column if not exists upsell_sent_at timestamptz,
  add column if not exists upsell_webinar_id uuid references webinars(id) on delete set null,
  add column if not exists upsell_source_webinar_id uuid references webinars(id) on delete set null,
  add column if not exists upsell_bought_at timestamptz,
  add column if not exists cele_bio_synced boolean default false;

create index if not exists webinars_series_idx on webinars (series_id) where series_id is not null;
create index if not exists registrants_upsell_pending_idx
  on registrants (upsell_bought_at) where upsell_eligible and upsell_sent_at is null;
