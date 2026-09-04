-- Enterprise contact-sales leads.
-- Run after 0036_phase13_foundation.sql.

/*
 * Nowhere for the "Request a Demo" form to write to.
 *
 * enterprise_accounts (0035) is what an enterprise deal becomes once it is
 * signed; this is what a conversation looks like before that, and the two
 * should not share a table — a lead is not yet a team, may never become one,
 * and needs none of enterprise_accounts' contract fields.
 */
create table if not exists enterprise_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  full_name text not null,
  work_email text not null,
  phone text,
  team_size text,
  monthly_sessions text,
  current_platform text,
  message text,
  status text not null default 'new',
  assigned_to uuid references user_accounts(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists enterprise_leads_status_idx
  on enterprise_leads (status, created_at desc);

alter table enterprise_leads enable row level security;
/* Service role only — the contact form writes through the API, not directly. */
