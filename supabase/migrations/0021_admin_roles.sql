-- Admin roles, saved filters, and poll visibility.
-- Run after 0020_segments_broadcast.sql.

/*
 * Admin roles.
 *
 * is_admin currently grants everything: reading customer records, refunding
 * money, impersonating people. That is fine with one admin and indefensible
 * with three — a support person needs to answer tickets without also being
 * able to issue refunds.
 *
 * Kept as a single column rather than a permissions table. Three roles with
 * fixed capabilities is honest about the size of the problem; a full RBAC
 * schema would be more machinery than the product has decisions to make.
 */
alter table user_accounts
  add column if not exists admin_role text default 'owner';
-- owner   — everything, including granting roles
-- support — read customers, notes, resets, impersonate; no money, no roles
-- finance — billing, refunds, revenue; no impersonation

/*
 * Backfills existing admins as owners.
 *
 * Anyone already trusted with is_admin had every power; silently demoting them
 * on deploy would lock someone out of their own platform.
 */
update user_accounts set admin_role = 'owner' where is_admin and admin_role is null;

/** Saved views on the user list. The three or four you use daily. */
create table if not exists saved_filters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references user_accounts(id) on delete cascade,
  name text not null,
  /** Whatever the list's query string holds — plan, status, sort, search. */
  query text not null,
  created_at timestamptz default now()
);

create index if not exists saved_filters_owner_idx on saved_filters(owner_id);
alter table saved_filters enable row level security;

drop policy if exists "own filters" on saved_filters;
create policy "own filters" on saved_filters
  for select to authenticated using (owner_id = auth.uid());

/*
 * Poll results, aggregated.
 *
 * Showing the room its own answers is what makes a poll feel live rather than
 * like a form. Counted here so the client never needs every individual
 * response — a poll in a thousand-person room would otherwise ship a thousand
 * rows to every browser to render four bars.
 */
create or replace function public.poll_results(p_poll_id uuid)
returns table (option_id text, votes integer, share numeric)
language sql
security definer
set search_path = public
as $$
  with counted as (
    select option_id, count(*)::int as votes
      from poll_responses
     where poll_id = p_poll_id
     group by option_id
  ),
  total as (select coalesce(sum(votes), 0)::int as n from counted)
  select
    c.option_id,
    c.votes,
    case when t.n = 0 then 0 else round((c.votes::numeric / t.n) * 100, 1) end
  from counted c cross join total t
  order by c.votes desc;
$$;

revoke all on function public.poll_results(uuid) from public;
grant execute on function public.poll_results(uuid) to anon, authenticated, service_role;
