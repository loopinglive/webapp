-- Phase 12: teams, marketplace, academy, script writer, enterprise.
-- Run after 0034_fraud_signals_fix.sql.

/*
 * Checked against the live schema before writing this, not assumed from the
 * spec. `certificates`, `exit_surveys`, `private_messages` and
 * `webinar_series` do not exist in this database despite being listed as
 * "already built" in the Phase 12 prompt — so `blockchain_certificates`,
 * which references `certificates`, is deliberately left out of this
 * migration. It has nothing to point at yet.
 */

-- ─── Teams ──────────────────────────────────────────────────────────────────

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references user_accounts(id) on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  plan_slug text not null default 'team_starter',
  max_members integer default 5,
  max_webinars integer default 20,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references user_accounts(id) on delete cascade,
  role text not null default 'member',
  invited_by uuid references user_accounts(id),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  status text default 'pending',
  permissions jsonb default '{}',
  unique (team_id, user_id)
);

create index if not exists team_members_user_idx on team_members (user_id);

create table if not exists team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  invited_email text not null,
  role text not null default 'member',
  invited_by uuid references user_accounts(id),
  token text not null unique default gen_random_uuid()::text,
  expires_at timestamptz default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz default now()
);

alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invitations enable row level security;
/* Service role only; the app layer enforces team membership on every read. */

-- ─── Marketplace ────────────────────────────────────────────────────────────

create table if not exists marketplace_seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade unique,
  display_name text not null,
  bio text,
  avatar_url text,
  website_url text,
  total_sales integer default 0,
  total_earnings numeric default 0,
  average_rating numeric(3,2) default 0,
  stripe_connect_account_id text,
  stripe_connect_onboarded boolean default false,
  payout_enabled boolean default false,
  created_at timestamptz default now()
);

create table if not exists marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references user_accounts(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  listing_type text not null,
  price numeric not null default 0,
  currency text default 'usd',
  preview_url text,
  thumbnail_url text,
  demo_url text,
  tags jsonb default '[]',
  /* What the buyer actually receives — shaped per listing_type, applied by
     /api/marketplace/apply-template. */
  included_items jsonb default '{}',
  total_sales integer default 0,
  average_rating numeric(3,2) default 0,
  review_count integer default 0,
  is_featured boolean default false,
  is_approved boolean default false,
  is_active boolean default true,
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists marketplace_listings_browse_idx
  on marketplace_listings (category, created_at desc)
  where is_approved and is_active;

create table if not exists marketplace_purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references marketplace_listings(id) on delete cascade,
  buyer_id uuid references user_accounts(id) on delete cascade,
  seller_id uuid references user_accounts(id),
  amount_paid numeric not null,
  stripe_payment_intent_id text,
  platform_fee numeric not null,
  seller_earnings numeric not null,
  status text default 'completed',
  purchased_at timestamptz default now(),
  /* One purchase per buyer per listing — the same guarantee purchases()
     already gives webinar offers, and for the same reason: a re-processed
     webhook must not double-count a sale or grant a second entitlement. */
  unique (listing_id, buyer_id)
);

create table if not exists marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references marketplace_listings(id) on delete cascade,
  reviewer_id uuid references user_accounts(id) on delete cascade,
  purchase_id uuid references marketplace_purchases(id),
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  is_verified_purchase boolean default true,
  created_at timestamptz default now(),
  unique (listing_id, reviewer_id)
);

alter table marketplace_seller_profiles enable row level security;
alter table marketplace_listings enable row level security;
alter table marketplace_purchases enable row level security;
alter table marketplace_reviews enable row level security;

drop policy if exists "browse approved listings" on marketplace_listings;
create policy "browse approved listings" on marketplace_listings
  for select to anon, authenticated using (is_approved and is_active);

/* Recomputes the two numbers shown on every listing card, from the reviews
   that actually exist — never trusted from the client. */
create or replace function public.recalculate_listing_rating(p_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update marketplace_listings
     set average_rating = coalesce((
           select round(avg(rating)::numeric, 2)
             from marketplace_reviews
            where listing_id = p_listing_id
         ), 0),
         review_count = (
           select count(*) from marketplace_reviews where listing_id = p_listing_id
         )
   where id = p_listing_id;
$$;

revoke all on function public.recalculate_listing_rating(uuid) from public, anon, authenticated;
grant execute on function public.recalculate_listing_rating(uuid) to service_role;

-- ─── Academy ─────────────────────────────────────────────────────────────────

create table if not exists academy_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  thumbnail_url text,
  category text not null,
  difficulty text default 'beginner',
  estimated_minutes integer not null,
  is_free boolean default true,
  is_published boolean default false,
  position integer default 0,
  created_at timestamptz default now()
);

create table if not exists academy_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references academy_courses(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  duration_seconds integer,
  position integer not null,
  is_preview boolean default false,
  created_at timestamptz default now()
);

create table if not exists academy_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  course_id uuid references academy_courses(id) on delete cascade,
  lesson_id uuid references academy_lessons(id),
  completed_lesson_ids jsonb default '[]',
  completed_at timestamptz,
  unique (user_id, course_id)
);

alter table academy_courses enable row level security;
alter table academy_lessons enable row level security;
alter table academy_progress enable row level security;

drop policy if exists "read published courses" on academy_courses;
create policy "read published courses" on academy_courses
  for select to anon, authenticated using (is_published);

drop policy if exists "read lessons of published courses" on academy_lessons;
create policy "read lessons of published courses" on academy_lessons
  for select to anon, authenticated using (
    exists (
      select 1 from academy_courses c
       where c.id = academy_lessons.course_id and c.is_published
    )
  );

-- ─── Script writer ──────────────────────────────────────────────────────────

create table if not exists webinar_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete set null,
  title text not null,
  topic text not null,
  target_audience text,
  offer_description text,
  webinar_length_minutes integer default 60,
  script_content jsonb not null default '{}',
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table webinar_scripts enable row level security;

-- ─── Enterprise ─────────────────────────────────────────────────────────────

create table if not exists enterprise_accounts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade unique,
  contract_start_date date,
  contract_end_date date,
  custom_price_monthly numeric,
  custom_max_members integer,
  custom_max_webinars integer,
  custom_max_attendees_per_session integer,
  dedicated_support_email text,
  sla_response_hours integer default 4,
  custom_onboarding boolean default false,
  white_label_included boolean default true,
  api_rate_limit_per_minute integer default 1000,
  notes text,
  account_manager_id uuid references user_accounts(id),
  created_at timestamptz default now()
);

alter table enterprise_accounts enable row level security;

-- ─── Push notification device tokens ───────────────────────────────────────
-- Table only, this pass — nothing registers a token without a mobile app,
-- which was deliberately deferred. Kept forward-compatible rather than built
-- around a client that does not exist yet.

create table if not exists push_notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  device_token text not null,
  platform text not null,
  app_version text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table push_notification_subscriptions enable row level security;

-- ─── GraphQL query log ──────────────────────────────────────────────────────
-- Table only. No GraphQL endpoint exists yet — that part of the spec was cut
-- off by the message length limit before it reached this codebase, so there
-- is nothing to build against. Kept so the eventual endpoint has somewhere
-- to log to without a follow-up migration.

create table if not exists graphql_query_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references api_keys(id) on delete set null,
  operation_name text,
  query_hash text,
  variables jsonb,
  response_time_ms integer,
  status text,
  created_at timestamptz default now()
);

alter table graphql_query_logs enable row level security;

-- ─── Updates to existing tables ─────────────────────────────────────────────

alter table webinars
  add column if not exists team_id uuid references teams(id) on delete set null,
  add column if not exists script_id uuid references webinar_scripts(id) on delete set null;

alter table user_accounts
  add column if not exists team_id uuid references teams(id) on delete set null,
  add column if not exists team_role text,
  add column if not exists enterprise_account_id uuid references enterprise_accounts(id) on delete set null,
  add column if not exists mobile_app_registered boolean default false,
  add column if not exists last_mobile_app_login timestamptz,
  add column if not exists is_marketplace_seller boolean default false,
  add column if not exists marketplace_seller_id uuid references marketplace_seller_profiles(id) on delete set null;
