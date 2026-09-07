-- Phase 14: a provider-agnostic ledger for in-flight local payments.
-- Run after 0045_phase14_payments_seed.sql.
--
-- Paystack, Flutterwave, and Razorpay all round-trip your own metadata back
-- to you (Paystack/Flutterwave via `metadata`/`meta`, Razorpay via `notes`),
-- so in principle they don't need this. M-Pesa's STK push callback does not
-- — Safaricom calls back with only a CheckoutRequestID, so this is what maps
-- that back to a userId and planSlug. Used for all four providers anyway, for
-- one consistent place to see every local payment attempt regardless of
-- provider, and to guard against a webhook being replayed against an intent
-- that has already been activated.

create table if not exists local_payment_intents (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_reference text not null,
  user_id uuid references user_accounts(id) on delete cascade,
  plan_slug text not null,
  amount numeric not null,
  currency text not null,
  status text not null default 'pending',
  created_at timestamptz default now(),
  completed_at timestamptz,
  unique (provider, provider_reference)
);

create index if not exists local_payment_intents_user_idx on local_payment_intents (user_id, created_at desc);

alter table local_payment_intents enable row level security;
