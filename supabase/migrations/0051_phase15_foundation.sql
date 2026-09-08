-- Phase 15: AI-native platform foundation — autonomous generation, voice
-- cloning, real-time translation, autonomous agents, CRM, co-hosting,
-- predictive nurture, platform federation.
-- Run after 0050_phase14_plugin_docs.sql.
--
-- The white-label mobile app builder from the Phase 15 spec is deliberately
-- not built this pass (no CI build farm or Apple/Google publishing
-- credentials exist for this deployment) — white_label_mobile_apps is not
-- created here for a feature that doesn't exist yet.

create table if not exists autonomous_webinars (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade unique,
  user_id uuid references user_accounts(id) on delete cascade,
  topic text not null,
  target_audience text not null,
  offer_description text not null,
  niche text not null,
  generation_status text default 'pending',
  script_generated_at timestamptz,
  presentation_generated_at timestamptz,
  voice_cloned_at timestamptz,
  video_assembled_at timestamptz,
  personas_generated_at timestamptz,
  automation_configured_at timestamptz,
  published_at timestamptz,
  generation_log jsonb default '[]',
  estimated_completion_minutes integer,
  config jsonb default '{}',
  error text,
  created_at timestamptz default now()
);

create index if not exists autonomous_webinars_user_idx on autonomous_webinars (user_id, created_at desc);

create table if not exists voice_clones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  clone_name text not null,
  provider text not null default 'elevenlabs',
  provider_voice_id text not null,
  sample_audio_url text,
  status text default 'processing',
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists voice_clones_user_idx on voice_clones (user_id);

create table if not exists ai_presentations (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  user_id uuid references user_accounts(id) on delete cascade,
  topic text not null,
  slide_count integer default 0,
  slides jsonb default '[]',
  theme text default 'dark_professional',
  status text default 'generating',
  video_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists ai_presentations_webinar_idx on ai_presentations (webinar_id);

create table if not exists real_time_translations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  source_language text not null default 'en',
  target_languages jsonb not null default '[]',
  transcription_provider text default 'deepgram',
  translation_provider text default 'deepl',
  is_active boolean default true,
  latency_ms integer,
  created_at timestamptz default now()
);

create table if not exists translation_segments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  original_text text not null,
  translations jsonb not null default '{}',
  start_time_seconds numeric not null,
  end_time_seconds numeric not null,
  speaker text default 'host',
  confidence numeric(5,2),
  created_at timestamptz default now()
);

create index if not exists translation_segments_session_idx on translation_segments (session_id, start_time_seconds);

create table if not exists autonomous_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete cascade,
  agent_type text not null,
  agent_name text not null,
  personality jsonb not null,
  objectives jsonb not null,
  constraints jsonb default '{}',
  conversation_memory jsonb default '[]',
  is_active boolean default true,
  messages_sent integer default 0,
  deals_closed integer default 0,
  total_revenue_attributed numeric default 0,
  created_at timestamptz default now()
);

create index if not exists autonomous_agents_webinar_idx on autonomous_agents (webinar_id) where is_active;

create table if not exists agent_conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references autonomous_agents(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  channel text not null,
  status text default 'active',
  messages jsonb default '[]',
  lead_temperature text default 'cold',
  next_action text,
  next_action_at timestamptz,
  converted boolean default false,
  converted_at timestamptz,
  revenue_attributed numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (agent_id, registrant_id)
);

create index if not exists agent_conversations_due_idx on agent_conversations (next_action_at) where status = 'active';
create index if not exists agent_conversations_registrant_idx on agent_conversations (registrant_id);

create table if not exists deal_pipelines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  name text not null,
  stages jsonb not null default '[]',
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid references deal_pipelines(id) on delete cascade,
  webinar_id uuid references webinars(id),
  registrant_id uuid references registrants(id) on delete cascade,
  title text not null,
  value numeric default 0,
  stage text not null,
  probability integer default 0,
  expected_close_date date,
  assigned_to uuid references user_accounts(id),
  notes text,
  activities jsonb default '[]',
  won boolean default false,
  lost boolean default false,
  lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists deals_pipeline_idx on deals (pipeline_id, stage);
create index if not exists deals_registrant_idx on deals (registrant_id);

create table if not exists co_hosts (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  host_user_id uuid references user_accounts(id),
  co_host_user_id uuid references user_accounts(id),
  co_host_email text,
  permissions jsonb default '{}',
  status text default 'invited',
  invite_token text unique,
  invite_expires_at timestamptz,
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique(webinar_id, co_host_user_id)
);

create index if not exists co_hosts_webinar_idx on co_hosts (webinar_id);
create index if not exists co_hosts_user_idx on co_hosts (co_host_user_id);

create table if not exists co_host_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  co_host_id uuid references co_hosts(id) on delete cascade,
  joined_at timestamptz,
  left_at timestamptz,
  messages_sent integer default 0,
  is_active boolean default false
);

create table if not exists platform_federation (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references user_accounts(id) on delete cascade,
  host_platform_url text not null,
  partner_platform_url text not null,
  partnership_type text not null,
  shared_audience boolean default false,
  shared_analytics boolean default false,
  cross_promotion_enabled boolean default false,
  api_key_hash text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists federated_audiences (
  id uuid primary key default gen_random_uuid(),
  federation_id uuid references platform_federation(id) on delete cascade,
  email_hash text not null,
  shared_at timestamptz default now(),
  source_platform text not null,
  consent_given boolean default true,
  unique (federation_id, email_hash)
);

create table if not exists predictive_nurture_sequences (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  sequence_type text not null,
  predicted_conversion_date date,
  optimal_contact_times jsonb default '[]',
  preferred_channel text default 'email',
  personalisation_data jsonb default '{}',
  touchpoints jsonb default '[]',
  status text default 'proposed',
  messages_sent integer default 0,
  last_message_sent_at timestamptz,
  converted boolean default false,
  created_at timestamptz default now(),
  unique (webinar_id, registrant_id)
);

create table if not exists voice_messages (
  id uuid primary key default gen_random_uuid(),
  agent_conversation_id uuid references agent_conversations(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  voice_clone_id uuid references voice_clones(id),
  script text not null,
  audio_url text,
  duration_seconds integer,
  channel text not null,
  status text default 'pending',
  delivered_at timestamptz,
  created_at timestamptz default now()
);

alter table autonomous_webinars enable row level security;
alter table voice_clones enable row level security;
alter table ai_presentations enable row level security;
alter table real_time_translations enable row level security;
alter table translation_segments enable row level security;
alter table autonomous_agents enable row level security;
alter table agent_conversations enable row level security;
alter table deal_pipelines enable row level security;
alter table deals enable row level security;
alter table co_hosts enable row level security;
alter table co_host_sessions enable row level security;
alter table platform_federation enable row level security;
alter table federated_audiences enable row level security;
alter table predictive_nurture_sequences enable row level security;
alter table voice_messages enable row level security;
