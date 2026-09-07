-- Phase 14: global expansion, accessibility, advanced security, plugin ecosystem,
-- multi-platform streaming, creator economy, advanced video, documentation.
-- Run after 0042_upsell_eligible_at.sql.

-- ─── Global expansion ───────────────────────────────────────────────────────

create table if not exists localized_pricing (
  id uuid primary key default gen_random_uuid(),
  country_code text not null unique,
  country_name text not null,
  currency_code text not null,
  currency_symbol text not null,
  monthly_price numeric not null,
  yearly_price numeric not null,
  lifetime_price numeric not null,
  purchasing_power_parity_factor numeric default 1.0,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  stripe_price_id_lifetime text,
  payment_methods jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists local_payment_methods (
  id uuid primary key default gen_random_uuid(),
  method_name text not null,
  method_type text not null,
  supported_countries jsonb not null,
  provider text not null,
  provider_config jsonb default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── Accessibility ──────────────────────────────────────────────────────────

create table if not exists accessibility_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade unique,
  reduce_motion boolean default false,
  high_contrast boolean default false,
  large_text boolean default false,
  screen_reader_optimised boolean default false,
  captions_enabled boolean default true,
  caption_size text default 'medium',
  caption_background boolean default true,
  keyboard_navigation_hints boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Advanced security ──────────────────────────────────────────────────────

create table if not exists sso_configurations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade unique,
  provider text not null,
  entity_id text,
  sso_url text not null,
  certificate text not null,
  attribute_mapping jsonb default '{}',
  is_active boolean default true,
  require_sso boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sso_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references user_accounts(id) on delete cascade,
  session_token text not null unique,
  provider text not null,
  provider_session_id text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists sso_sessions_user_idx on sso_sessions (user_id);
create index if not exists sso_sessions_expires_idx on sso_sessions (expires_at);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id),
  team_id uuid references teams(id),
  action text not null,
  resource_type text not null,
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  session_id text,
  created_at timestamptz default now()
);

create index if not exists audit_logs_user_idx on audit_logs (user_id, created_at desc);
create index if not exists audit_logs_team_idx on audit_logs (team_id, created_at desc);
create index if not exists audit_logs_action_idx on audit_logs (action);
create index if not exists audit_logs_resource_idx on audit_logs (resource_type, resource_id);

create table if not exists soc2_evidence (
  id uuid primary key default gen_random_uuid(),
  control_id text not null,
  control_name text not null,
  evidence_type text not null,
  evidence_data jsonb not null,
  collected_at timestamptz default now(),
  review_period_start date,
  review_period_end date
);

create index if not exists soc2_evidence_control_idx on soc2_evidence (control_id, collected_at desc);

-- ─── GDPR / data privacy ────────────────────────────────────────────────────

create table if not exists data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  request_type text not null,
  status text default 'pending',
  export_url text,
  expires_at timestamptz,
  requested_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists data_export_requests_user_idx on data_export_requests (user_id, requested_at desc);

create table if not exists gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  requester_email text not null,
  request_type text not null,
  webinar_id uuid references webinars(id),
  status text default 'pending',
  processed_by uuid references user_accounts(id),
  processed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create index if not exists gdpr_requests_webinar_idx on gdpr_requests (webinar_id, status);

-- ─── Plugin ecosystem ───────────────────────────────────────────────────────

create table if not exists plugins (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid references user_accounts(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null,
  version text not null default '1.0.0',
  category text not null,
  manifest jsonb not null,
  bundle_url text not null,
  icon_url text,
  screenshots jsonb default '[]',
  pricing_type text default 'free',
  price numeric default 0,
  install_count integer default 0,
  average_rating numeric(3,2) default 0,
  is_approved boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists plugins_category_idx on plugins (category) where is_approved and is_active;
create index if not exists plugins_developer_idx on plugins (developer_id);

create table if not exists plugin_installations (
  id uuid primary key default gen_random_uuid(),
  plugin_id uuid references plugins(id) on delete cascade,
  user_id uuid references user_accounts(id) on delete cascade,
  webinar_id uuid references webinars(id),
  settings jsonb default '{}',
  is_active boolean default true,
  installed_at timestamptz default now(),
  unique(plugin_id, user_id, webinar_id)
);

create index if not exists plugin_installations_user_idx on plugin_installations (user_id);
create index if not exists plugin_installations_webinar_idx on plugin_installations (webinar_id);

create table if not exists plugin_events (
  id uuid primary key default gen_random_uuid(),
  plugin_id uuid references plugins(id) on delete cascade,
  installation_id uuid references plugin_installations(id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}',
  response jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);

create index if not exists plugin_events_installation_idx on plugin_events (installation_id, created_at desc);

-- ─── Multi-platform streaming ───────────────────────────────────────────────

create table if not exists multi_stream_destinations (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  user_id uuid references user_accounts(id) on delete cascade,
  platform text not null,
  stream_key text not null,
  rtmp_url text not null,
  is_active boolean default true,
  last_streamed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists multi_stream_destinations_webinar_idx on multi_stream_destinations (webinar_id);
create index if not exists multi_stream_destinations_user_idx on multi_stream_destinations (user_id);

-- ─── Creator economy ────────────────────────────────────────────────────────

create table if not exists creator_economy_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade unique,
  creator_handle text unique,
  bio text,
  niche text,
  audience_size_estimate integer,
  verified boolean default false,
  featured boolean default false,
  total_webinars_hosted integer default 0,
  total_attendees_served integer default 0,
  total_revenue_generated numeric default 0,
  follower_count integer default 0,
  public_profile_enabled boolean default false,
  social_links jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists creator_economy_profiles_handle_idx on creator_economy_profiles (creator_handle) where public_profile_enabled;
create index if not exists creator_economy_profiles_niche_idx on creator_economy_profiles (niche) where public_profile_enabled;

create table if not exists creator_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references user_accounts(id) on delete cascade,
  creator_id uuid references creator_economy_profiles(id) on delete cascade,
  followed_at timestamptz default now(),
  unique(follower_id, creator_id)
);

create index if not exists creator_follows_creator_idx on creator_follows (creator_id);
create index if not exists creator_follows_follower_idx on creator_follows (follower_id);

-- ─── Advanced video ─────────────────────────────────────────────────────────

create table if not exists video_chapters (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  title text not null,
  start_seconds integer not null,
  end_seconds integer not null,
  description text,
  thumbnail_url text,
  created_at timestamptz default now()
);

create index if not exists video_chapters_webinar_idx on video_chapters (webinar_id, start_seconds);

create table if not exists interactive_elements (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  element_type text not null,
  config jsonb not null,
  video_offset_seconds integer not null,
  duration_seconds integer default 30,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists interactive_elements_webinar_idx on interactive_elements (webinar_id, video_offset_seconds);

-- ─── Documentation ──────────────────────────────────────────────────────────

create table if not exists documentation_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text not null,
  category text not null,
  subcategory text,
  position integer default 0,
  is_published boolean default true,
  last_edited_by uuid references user_accounts(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists documentation_pages_category_idx on documentation_pages (category, position) where is_published;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Every table here is read and written exclusively through the service-role
-- client with authorization enforced in application code (lib/webinar-access.ts,
-- lib/billing/account.ts), matching every other table added since Phase 11.
-- RLS is enabled with no policies, so anon/authenticated get nothing and only
-- service_role (which bypasses RLS) can reach these rows.

alter table localized_pricing enable row level security;
alter table local_payment_methods enable row level security;
alter table accessibility_preferences enable row level security;
alter table sso_configurations enable row level security;
alter table sso_sessions enable row level security;
alter table audit_logs enable row level security;
alter table soc2_evidence enable row level security;
alter table data_export_requests enable row level security;
alter table gdpr_requests enable row level security;
alter table plugins enable row level security;
alter table plugin_installations enable row level security;
alter table plugin_events enable row level security;
alter table multi_stream_destinations enable row level security;
alter table creator_economy_profiles enable row level security;
alter table creator_follows enable row level security;
alter table video_chapters enable row level security;
alter table interactive_elements enable row level security;
alter table documentation_pages enable row level security;
