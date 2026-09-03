-- Super admin observability.
-- Run after 0015_phase8_integrations.sql.

/*
 * Cron health, exposed to the app.
 *
 * cron.job and cron.job_run_details live in the cron schema, which the
 * PostgREST role cannot reach. A security-definer function is the supported
 * way to surface them — narrower than granting schema access, and it returns
 * only the columns the panel renders.
 *
 * Two silent failures prompted this: a job reading a config key nobody had
 * written, and a suppressed email address returning a normal message id. Both
 * looked exactly like health from the outside.
 */
create or replace function public.admin_cron_health()
returns table (
  jobname text,
  schedule text,
  active boolean,
  last_run timestamptz,
  last_status text,
  last_duration_ms integer,
  failures_24h integer,
  runs_24h integer
)
language sql
security definer
set search_path = public, cron
as $$
  select
    j.jobname::text,
    j.schedule::text,
    j.active,
    latest.start_time,
    latest.status::text,
    (extract(milliseconds from (latest.end_time - latest.start_time)))::integer,
    coalesce(day.failures, 0)::integer,
    coalesce(day.runs, 0)::integer
  from cron.job j
  left join lateral (
    select d.start_time, d.end_time, d.status
      from cron.job_run_details d
     where d.jobid = j.jobid
     order by d.start_time desc
     limit 1
  ) latest on true
  left join lateral (
    select
      count(*) as runs,
      count(*) filter (where d.status <> 'succeeded') as failures
      from cron.job_run_details d
     where d.jobid = j.jobid
       and d.start_time > now() - interval '24 hours'
  ) day on true
  order by j.jobname;
$$;

revoke all on function public.admin_cron_health() from public, anon;
grant execute on function public.admin_cron_health() to authenticated, service_role;

/*
 * Cohort retention.
 *
 * For each signup month, how many of that cohort were still on a paid plan a
 * given number of months later. Computed from invoices rather than the current
 * plan, because the current plan only tells you about today.
 */
create or replace function public.admin_cohort_retention(p_months integer default 6)
returns table (
  cohort text,
  cohort_size integer,
  month_offset integer,
  retained integer
)
language sql
security definer
set search_path = public
as $$
  with cohorts as (
    select
      id,
      date_trunc('month', created_at) as cohort_month
    from user_accounts
    where created_at > now() - (p_months + 1) * interval '1 month'
  ),
  sizes as (
    select cohort_month, count(*)::int as size
      from cohorts group by cohort_month
  ),
  offsets as (
    select generate_series(0, p_months) as n
  )
  select
    to_char(s.cohort_month, 'Mon YY') as cohort,
    s.size,
    o.n,
    (
      select count(distinct c.id)::int
        from cohorts c
        join invoices i on i.user_id = c.id and i.status = 'paid'
       where c.cohort_month = s.cohort_month
         and i.paid_at >= s.cohort_month + (o.n * interval '1 month')
         and i.paid_at <  s.cohort_month + ((o.n + 1) * interval '1 month')
    )
  from sizes s
  cross join offsets o
  where s.cohort_month + (o.n * interval '1 month') <= now()
  order by s.cohort_month desc, o.n;
$$;

revoke all on function public.admin_cohort_retention(integer) from public, anon;
grant execute on function public.admin_cohort_retention(integer) to authenticated, service_role;

-- Admin action log, replacing the use of impersonation_logs for plan grants.
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references user_accounts(id) on delete set null,
  target_user_id uuid references user_accounts(id) on delete set null,
  action text not null,
  detail jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists admin_actions_created_idx on admin_actions(created_at desc);
create index if not exists admin_actions_target_idx on admin_actions(target_user_id);

alter table admin_actions enable row level security;

-- Suspension now records why, so it is defensible with more than one admin.
alter table user_accounts
  add column if not exists suspended_reason text,
  add column if not exists suspended_at timestamptz;
