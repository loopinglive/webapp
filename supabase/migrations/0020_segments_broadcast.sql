-- Saved segments, broadcasts, and announcement targeting.
-- Run after 0019_offer_experiments.sql.

/*
 * A saved segment.
 *
 * "Free accounts with a published webinar who have not upgraded" is the best
 * upsell list this business has, and there was no way to produce it. Stored as
 * named filters rather than a raw SQL string: a segment someone can edit into
 * `drop table` is not a feature.
 */
create table if not exists saved_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  /*
   * Shape: { plan?: string[], hasWebinar?: boolean, hasPublished?: boolean,
   *          hasPaid?: boolean, signedUpWithinDays?: number,
   *          inactiveForDays?: number }
   */
  filters jsonb not null default '{}',
  created_by uuid references user_accounts(id) on delete set null,
  created_at timestamptz default now()
);

alter table saved_segments enable row level security;

/*
 * Resolves a segment to accounts.
 *
 * In SQL rather than the app so a broadcast counts the same people it sends
 * to — computing the audience twice in two places is how a "sent to 400" ends
 * up meaning 380.
 */
create or replace function public.resolve_segment(p_filters jsonb)
returns table (user_id uuid, email text, full_name text, plan_slug text)
language sql
security definer
set search_path = public
as $$
  select a.id, a.email, a.full_name, a.plan_slug
    from user_accounts a
   where a.is_suspended = false
     and (
       p_filters->'plan' is null
       or a.plan_slug = any (
         select jsonb_array_elements_text(p_filters->'plan')
       )
     )
     and (
       p_filters->>'signedUpWithinDays' is null
       or a.created_at >= now()
         - ((p_filters->>'signedUpWithinDays')::int * interval '1 day')
     )
     and (
       p_filters->>'inactiveForDays' is null
       or a.last_login_at is null
       or a.last_login_at < now()
         - ((p_filters->>'inactiveForDays')::int * interval '1 day')
     )
     and (
       p_filters->>'hasWebinar' is null
       or (p_filters->>'hasWebinar')::boolean
          = exists (select 1 from webinars w where w.owner_id = a.id)
     )
     and (
       p_filters->>'hasPublished' is null
       or (p_filters->>'hasPublished')::boolean
          = exists (
              select 1 from webinars w
               where w.owner_id = a.id and w.status = 'published'
            )
     )
     and (
       p_filters->>'hasPaid' is null
       or (p_filters->>'hasPaid')::boolean
          = exists (
              select 1 from invoices i
               where i.user_id = a.id and i.status = 'paid'
            )
     );
$$;

revoke all on function public.resolve_segment(jsonb) from public, anon;
grant execute on function public.resolve_segment(jsonb) to authenticated, service_role;

/*
 * A broadcast to a segment.
 *
 * Recorded before it is sent, so a crash halfway leaves evidence of what was
 * attempted rather than an unexplained partial send.
 */
create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid references saved_segments(id) on delete set null,
  filters jsonb not null default '{}',
  subject text not null,
  body text not null,
  status text default 'draft',
  recipient_count integer default 0,
  sent_count integer default 0,
  failed_count integer default 0,
  sent_at timestamptz,
  created_by uuid references user_accounts(id) on delete set null,
  created_at timestamptz default now()
);

alter table broadcasts enable row level security;

-- Announcements can now target a plan rather than everyone.
alter table platform_announcements
  add column if not exists target_plans jsonb default '[]';
