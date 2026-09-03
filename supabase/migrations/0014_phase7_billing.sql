-- Phase 7 — SaaS billing, accounts, affiliates, super admin.
-- Run after 0013_analytics_rollups.sql.

-- ─────────────────────────── plans ───────────────────────────
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  price_monthly numeric,
  price_display text not null,
  billing_period text not null,
  stripe_price_id text,
  features jsonb default '[]',
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into plans (name, slug, price_monthly, price_display, billing_period, sort_order, features) values
  ('Free', 'free', 0, '$0', 'free', 0,
   '["Full webinar setup","Upload videos","Create personas","Configure automation","Cannot go live until upgraded"]'),
  ('Monthly', 'monthly', 47, '$47/month', 'monthly', 1,
   '["Everything in Free","Go live instantly","Unlimited webinar sessions","AI personas","SMS and WhatsApp automation","Full analytics","Cancel anytime"]'),
  ('Yearly', 'yearly', 28.92, '$347/year', 'yearly', 2,
   '["Everything in Monthly","Save 38% vs monthly","Priority support","Early access to new features"]'),
  ('Lifetime', 'lifetime', null, '$1,397 once', 'lifetime', 3,
   '["Everything in Yearly","Pay once own forever","Lifetime updates","VIP support"]')
on conflict (slug) do nothing;

-- ─────────────────────── user_accounts ───────────────────────
-- One row per auth user. Mirrors auth.users so the app can query plan state
-- without reaching into the auth schema on every request.
create table if not exists user_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  phone text,
  country_code text,
  timezone text default 'UTC',
  plan_slug text not null default 'free' references plans(slug),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_status text default 'active',
  plan_started_at timestamptz,
  plan_expires_at timestamptz,
  trial_ends_at timestamptz,
  is_admin boolean default false,
  is_suspended boolean default false,
  admin_note text,
  referral_code text unique default substring(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  referred_by uuid references user_accounts(id),
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists user_accounts_plan_idx on user_accounts(plan_slug);
create index if not exists user_accounts_referred_by_idx on user_accounts(referred_by);
create index if not exists user_accounts_stripe_customer_idx on user_accounts(stripe_customer_id);

-- ───────────────────────── invoices ─────────────────────────
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  stripe_invoice_id text unique,
  stripe_payment_intent_id text,
  amount numeric not null,
  currency text default 'usd',
  status text not null,
  plan_slug text not null,
  billing_period text not null,
  invoice_url text,
  invoice_pdf_url text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists invoices_user_idx on invoices(user_id, created_at desc);

-- ───────────────────────── coupons ─────────────────────────
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  stripe_coupon_id text,
  discount_type text not null,
  discount_value numeric not null,
  applies_to jsonb default '[]',
  max_uses integer,
  uses_count integer default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_by uuid references user_accounts(id),
  created_at timestamptz default now()
);

-- ──────────────────────── affiliates ────────────────────────
create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade unique,
  referral_code text not null unique,
  commission_rate numeric default 20,
  total_referrals integer default 0,
  total_earnings numeric default 0,
  pending_earnings numeric default 0,
  paid_earnings numeric default 0,
  is_active boolean default true,
  payout_method text,
  payout_details jsonb,
  created_at timestamptz default now()
);

create table if not exists affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) on delete cascade,
  referred_user_id uuid references user_accounts(id),
  invoice_id uuid references invoices(id),
  commission_amount numeric,
  status text default 'pending',
  confirms_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists affiliate_referrals_affiliate_idx
  on affiliate_referrals(affiliate_id, created_at desc);

-- ─────────────────────── feature flags ───────────────────────
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete cascade,
  flag_name text not null,
  is_enabled boolean default false,
  created_at timestamptz default now(),
  unique(user_id, flag_name)
);

-- ────────────────────── announcements ──────────────────────
create table if not exists platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text default 'info',
  is_active boolean default true,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_by uuid references user_accounts(id),
  created_at timestamptz default now()
);

-- ───────────────────── impersonation logs ─────────────────────
create table if not exists impersonation_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references user_accounts(id),
  impersonated_user_id uuid references user_accounts(id),
  started_at timestamptz default now(),
  ended_at timestamptz,
  reason text
);

-- ───────────────────────── RLS ─────────────────────────
-- Plans are the only publicly readable table here: the pricing page needs
-- them before anyone has signed in. Everything else is reachable only through
-- the service role, or by the owning user for their own row.
alter table plans enable row level security;
alter table user_accounts enable row level security;
alter table invoices enable row level security;
alter table coupons enable row level security;
alter table affiliates enable row level security;
alter table affiliate_referrals enable row level security;
alter table feature_flags enable row level security;
alter table platform_announcements enable row level security;
alter table impersonation_logs enable row level security;

drop policy if exists "plans are public" on plans;
create policy "plans are public" on plans
  for select to anon, authenticated using (is_active);

drop policy if exists "own account" on user_accounts;
create policy "own account" on user_accounts
  for select to authenticated using (id = auth.uid());

drop policy if exists "own invoices" on invoices;
create policy "own invoices" on invoices
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own affiliate" on affiliates;
create policy "own affiliate" on affiliates
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own referrals" on affiliate_referrals;
create policy "own referrals" on affiliate_referrals
  for select to authenticated using (
    affiliate_id in (select id from affiliates where user_id = auth.uid())
  );

drop policy if exists "active announcements" on platform_announcements;
create policy "active announcements" on platform_announcements
  for select to authenticated using (
    is_active
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

-- ─────────────── keep user_accounts in step with auth ───────────────
-- Signup goes through the API route, which writes this row with the service
-- role. This trigger is the safety net for users created any other way (the
-- Supabase dashboard, an OAuth provider) so a row always exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_accounts (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_user_accounts()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_accounts_touch on user_accounts;
create trigger user_accounts_touch
  before update on user_accounts
  for each row execute function public.touch_user_accounts();
