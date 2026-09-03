-- Chargebacks and dispute tracking.
-- Run after 0032_admin_ip_allowlist.sql.

/*
 * A dispute currently vanishes.
 *
 * Stripe fires charge.dispute.created the moment a cardholder's bank opens a
 * chargeback, and the webhook did not listen for it — there was no case for
 * that event type at all. A host running an actual scam accrues disputes with
 * no record anywhere in the product and no consequence on their account,
 * which is exactly the pattern trust and safety exists to catch.
 */
create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references purchases(id) on delete set null,
  stripe_dispute_id text unique not null,
  stripe_charge_id text,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  reason text,
  status text not null default 'open',
  webinar_id uuid references webinars(id) on delete set null,
  owner_id uuid references user_accounts(id) on delete set null,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists disputes_owner_idx on disputes (owner_id);
create index if not exists disputes_status_idx on disputes (status);

alter table disputes enable row level security;
/* Service role only, read through report_queue-style functions below. */

/*
 * A per-host score, computed rather than stored.
 *
 * Stored would mean it drifts the moment a dispute resolves and nobody
 * remembers to recompute it. Two things worth flagging, both cheap to check
 * on the read path and neither expensive enough to justify caching:
 *
 *   • Dispute rate above what payment processors themselves use as a
 *     warning line (1% of transactions is Stripe's own threshold before
 *     restrictions start).
 *   • Multiple open disputes at once, which a single unhappy customer does
 *     not produce — that takes a pattern.
 */
create or replace function public.host_fraud_signals(p_owner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with sales as (
    select count(*)::int as n, coalesce(sum(amount_cents), 0)::int as total_cents
      from purchases pu
      join webinars w on w.id = pu.webinar_id
     where w.owner_id = p_owner_id
  ),
  disputed as (
    select count(*)::int as n,
           count(*) filter (where status = 'open')::int as open_n,
           coalesce(sum(amount_cents), 0)::int as total_cents
      from disputes
     where owner_id = p_owner_id
  )
  select jsonb_build_object(
    'sales', (select n from sales),
    'sales_amount_cents', (select total_cents from sales),
    'disputes', (select n from disputed),
    'open_disputes', (select open_n from disputed),
    'disputed_amount_cents', (select total_cents from disputed),
    'dispute_rate', case
      when (select n from sales) = 0 then 0
      else round(
        (select n from disputed)::numeric / (select n from sales)::numeric,
        4
      )
    end,
    'flagged', (
      (select open_n from disputed) >= 2
      or (
        (select n from sales) >= 5
        and (select n from disputed)::numeric / (select n from sales)::numeric > 0.01
      )
    )
  );
$$;

/** Every host whose numbers cross the line above, for a screen to list. */
create or replace function public.flagged_hosts()
returns table (
  owner_id uuid,
  email text,
  full_name text,
  plan_slug text,
  signals jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct w.owner_id,
         ua.email,
         ua.full_name,
         ua.plan_slug,
         public.host_fraud_signals(w.owner_id)
    from webinars w
    join user_accounts ua on ua.id = w.owner_id
   where w.owner_id is not null
     and (public.host_fraud_signals(w.owner_id) ->> 'flagged')::boolean
   order by ua.email;
$$;

revoke all on function public.host_fraud_signals(uuid) from public, anon;
revoke all on function public.flagged_hosts() from public, anon;
grant execute on function public.host_fraud_signals(uuid) to authenticated, service_role;
grant execute on function public.flagged_hosts() to service_role;
