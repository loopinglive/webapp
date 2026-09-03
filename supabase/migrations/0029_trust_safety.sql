-- Trust and safety.
-- Run after 0028_maintenance.sql.

/*
 * The platform currently has no way to hear about a problem.
 *
 * Anyone can sign up, upload a video, and put it in front of an audience they
 * bring themselves. There is no report button, no queue, and no record — so
 * the first time you would learn that a customer is running something you do
 * not want your name on is when someone else tells you, and by then it has
 * been running for months.
 *
 * This is the smallest thing that closes that gap: somewhere for a complaint
 * to land, and somewhere to see it.
 */
create table if not exists content_reports (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete set null,
  /* Null when reported by someone who never registered. */
  registrant_id uuid references registrants(id) on delete set null,

  reason text not null,
  detail text,

  /* Not identity, and not kept for long — see the purge below. Enough to spot
     one person reporting the same webinar forty times. */
  reporter_fingerprint text,

  status text not null default 'open',
  resolution text,
  reviewed_by uuid references user_accounts(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists content_reports_open_idx
  on content_reports (created_at desc) where status = 'open';
create index if not exists content_reports_webinar_idx
  on content_reports (webinar_id);

alter table content_reports enable row level security;
/* Service role only. Reports arrive through a route that rate-limits them. */

/*
 * The fingerprint is a spam control, not a record of who complained.
 *
 * Someone reporting a webinar for a false claim should not have that traceable
 * to them a year later, and the only thing the fingerprint is for — noticing
 * the same person filing forty reports — stops being useful within days.
 */
create or replace function public.purge_report_fingerprints()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cleared integer;
begin
  update content_reports
     set reporter_fingerprint = null
   where reporter_fingerprint is not null
     and created_at < now() - interval '30 days';

  get diagnostics cleared = row_count;
  return cleared;
end;
$$;

revoke all on function public.purge_report_fingerprints() from public;
grant execute on function public.purge_report_fingerprints() to service_role;

select cron.schedule(
  'purge-report-fingerprints',
  '15 4 * * *',
  $$select public.purge_report_fingerprints();$$
)
where not exists (
  select 1 from cron.job where jobname = 'purge-report-fingerprints'
);

/*
 * The queue, with the context needed to judge a report without opening five
 * screens: who owns it, how big it is, and whether this is the first
 * complaint or the ninth.
 */
create or replace function public.report_queue(p_status text default 'open')
returns table (
  id uuid,
  webinar_id uuid,
  webinar_title text,
  owner_id uuid,
  owner_email text,
  owner_plan text,
  reason text,
  detail text,
  status text,
  created_at timestamptz,
  reports_for_webinar integer,
  registrants_reached integer
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id,
         r.webinar_id,
         w.title,
         w.owner_id,
         ua.email,
         ua.plan_slug,
         r.reason,
         r.detail,
         r.status,
         r.created_at,
         (select count(*)::int from content_reports c
           where c.webinar_id = r.webinar_id),
         (select count(*)::int from registrants reg
           where reg.webinar_id = r.webinar_id and not reg.is_test)
    from content_reports r
    left join webinars w on w.id = r.webinar_id
    left join user_accounts ua on ua.id = w.owner_id
   where r.status = p_status
   order by r.created_at desc
   limit 200;
$$;

revoke all on function public.report_queue(text) from public, anon;
grant execute on function public.report_queue(text) to service_role;
