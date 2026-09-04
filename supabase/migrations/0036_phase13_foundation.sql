-- Phase 13: attendee scoring, A/B testing, personalisation, growth intelligence.
-- Run after 0035_phase12_foundation.sql.

/*
 * Checked against the live schema before writing this: every table these
 * fifteen reference (registrants, webinars, user_accounts, webinar_sessions)
 * exists. None of these fifteen existed already.
 */

-- ─── Attendee intelligence ──────────────────────────────────────────────────

create table if not exists attendee_scores (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid references registrants(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete cascade,
  engagement_score integer default 0,
  conversion_likelihood numeric(5,2) default 0,
  churn_risk numeric(5,2) default 0,
  lifetime_value_estimate numeric default 0,
  score_factors jsonb default '{}',
  scored_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (registrant_id, webinar_id)
);

create index if not exists attendee_scores_hot_idx
  on attendee_scores (webinar_id, engagement_score desc);

create table if not exists conversion_predictions (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid references registrants(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete cascade,
  prediction_score numeric(5,2) not null,
  prediction_factors jsonb default '{}',
  predicted_at timestamptz default now(),
  outcome text,
  outcome_recorded_at timestamptz
);

-- ─── A/B testing ────────────────────────────────────────────────────────────

create table if not exists ab_tests (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  name text not null,
  description text,
  test_type text not null,
  variant_a jsonb not null,
  variant_b jsonb not null,
  traffic_split integer default 50,
  status text default 'draft',
  winner text,
  confidence_level numeric(5,2),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists ab_tests_running_idx
  on ab_tests (webinar_id) where status = 'running';

create table if not exists ab_test_assignments (
  id uuid primary key default gen_random_uuid(),
  ab_test_id uuid references ab_tests(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  variant text not null,
  assigned_at timestamptz default now(),
  converted boolean default false,
  converted_at timestamptz,
  unique (ab_test_id, registrant_id)
);

create table if not exists ab_test_results (
  id uuid primary key default gen_random_uuid(),
  ab_test_id uuid references ab_tests(id) on delete cascade,
  variant text not null,
  impressions integer default 0,
  conversions integer default 0,
  conversion_rate numeric(5,2) default 0,
  statistical_significance numeric(5,2) default 0,
  calculated_at timestamptz default now()
);

-- ─── Ad creatives ───────────────────────────────────────────────────────────

create table if not exists ad_creatives (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  user_id uuid references user_accounts(id) on delete cascade,
  platform text not null,
  format text not null,
  headline text not null,
  primary_text text not null,
  description text,
  call_to_action text not null,
  image_url text,
  video_url text,
  generated_by_ai boolean default true,
  performance_score numeric(5,2),
  status text default 'draft',
  created_at timestamptz default now()
);

-- ─── Personalisation ────────────────────────────────────────────────────────

create table if not exists personalisation_rules (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  rule_name text not null,
  conditions jsonb not null,
  actions jsonb not null,
  priority integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists personalisation_rules_active_idx
  on personalisation_rules (webinar_id, priority desc) where is_active;

create table if not exists personalisation_events (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid references registrants(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete set null,
  rule_id uuid references personalisation_rules(id) on delete set null,
  event_type text not null,
  data jsonb default '{}',
  created_at timestamptz default now()
);

-- ─── Support chatbot ────────────────────────────────────────────────────────

create table if not exists support_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete set null,
  registrant_id uuid references registrants(id) on delete cascade,
  status text default 'open',
  channel text default 'webinar_chat',
  messages jsonb default '[]',
  resolved_at timestamptz,
  satisfaction_rating integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Scheduling, forecasting, insights ──────────────────────────────────────

create table if not exists schedule_optimisations (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  recommended_times jsonb not null,
  analysis_data jsonb not null,
  based_on_sessions integer not null,
  confidence_score numeric(5,2),
  applied boolean default false,
  created_at timestamptz default now()
);

create table if not exists revenue_forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete set null,
  forecast_period text not null,
  forecast_type text not null,
  predicted_registrants integer,
  predicted_attendees integer,
  predicted_conversions integer,
  predicted_revenue numeric,
  confidence_interval_low numeric,
  confidence_interval_high numeric,
  actual_revenue numeric,
  accuracy_percentage numeric(5,2),
  model_version text,
  created_at timestamptz default now()
);

create table if not exists competitor_intelligence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  competitor_name text not null,
  competitor_url text,
  data_points jsonb default '{}',
  last_analysed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists platform_health_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  metric_value numeric not null,
  metric_unit text,
  threshold_warning numeric,
  threshold_critical numeric,
  status text default 'healthy',
  metadata jsonb default '{}',
  recorded_at timestamptz default now()
);

create index if not exists platform_health_metrics_recent_idx
  on platform_health_metrics (metric_name, recorded_at desc);

create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete set null,
  insight_type text not null,
  title text not null,
  body text not null,
  action_items jsonb default '[]',
  priority text default 'medium',
  is_read boolean default false,
  is_dismissed boolean default false,
  created_at timestamptz default now()
);

create index if not exists ai_insights_feed_idx
  on ai_insights (user_id, created_at desc) where not is_dismissed;

create table if not exists growth_experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hypothesis text not null,
  target_metric text not null,
  target_improvement numeric,
  status text default 'planned',
  results jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid references user_accounts(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists smart_segments (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  name text not null,
  description text,
  conditions jsonb not null,
  registrant_count integer default 0,
  last_evaluated_at timestamptz,
  is_dynamic boolean default true,
  created_at timestamptz default now()
);

-- ─── Row level security ─────────────────────────────────────────────────────
-- Service role only throughout, matching every other Phase 12/13 table — the
-- app layer enforces ownership (a host's own webinar_id, a user's own rows)
-- on every read, the same pattern already used for teams and marketplace.

alter table attendee_scores enable row level security;
alter table conversion_predictions enable row level security;
alter table ab_tests enable row level security;
alter table ab_test_assignments enable row level security;
alter table ab_test_results enable row level security;
alter table ad_creatives enable row level security;
alter table personalisation_rules enable row level security;
alter table personalisation_events enable row level security;
alter table support_conversations enable row level security;
alter table schedule_optimisations enable row level security;
alter table revenue_forecasts enable row level security;
alter table competitor_intelligence enable row level security;
alter table platform_health_metrics enable row level security;
alter table ai_insights enable row level security;
alter table growth_experiments enable row level security;
alter table smart_segments enable row level security;
