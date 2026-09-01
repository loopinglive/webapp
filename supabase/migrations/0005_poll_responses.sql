-- Loopinglive — recording what attendees answer.
-- Run after 0004_phase3_setup.sql.

create table if not exists poll_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references timed_polls(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  option_id text not null,
  created_at timestamptz default now(),
  -- One answer per attendee per poll; answering again changes their mind
  -- rather than stuffing the ballot.
  constraint poll_responses_poll_registrant_key unique (poll_id, registrant_id)
);

create index if not exists poll_responses_poll_idx on poll_responses (poll_id);
create index if not exists poll_responses_session_idx on poll_responses (session_id);

alter table poll_responses enable row level security;

-- Written through an API route on the service role; results are returned by
-- that same route, aggregated. No anon policy.
