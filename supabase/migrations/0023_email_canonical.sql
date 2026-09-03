-- Matching two addresses that reach the same inbox.
-- Run after 0022_test_sessions.sql.

/*
 * The same person registering twice should be one person.
 *
 * Dedupe currently compares the address as typed, so `j.smith+webinar@gmail.com`
 * and `jsmith@gmail.com` are two registrants, two reminder sequences, and two
 * rows in a host's show-up rate — for one person who will attend once.
 *
 * The canonical form is stored rather than computed on read, because the
 * matching rules are per-provider and belong in one place (lib/email-hygiene.ts).
 * A generated column would mean maintaining them in SQL as well.
 *
 * `email` is untouched. It is what the person typed and what their
 * confirmation is addressed to; the canonical form is for matching only.
 */
alter table registrants
  add column if not exists email_canonical text;

/*
 * Backfill.
 *
 * Approximate on purpose: this handles the Gmail rules, which is where nearly
 * all of the duplication is, and leaves everything else as the lowercased
 * address. Rows registered from here on get the full treatment from the
 * application.
 */
update registrants
   set email_canonical = case
     when split_part(lower(email), '@', 2) in ('gmail.com', 'googlemail.com')
       then replace(split_part(split_part(lower(email), '@', 1), '+', 1), '.', '')
            || '@gmail.com'
     else lower(email)
   end
 where email_canonical is null;

create index if not exists registrants_canonical_idx
  on registrants (webinar_id, email_canonical);

/*
 * Existing duplicates.
 *
 * Reported rather than merged. Merging means choosing which watch history and
 * which purchase flag survive, and getting that wrong silently is worse than
 * a host seeing the count. The registration path stops new ones from here.
 */
create or replace function public.duplicate_registrants(p_webinar_id uuid)
returns table (email_canonical text, copies integer, ids uuid[])
language sql
stable
security definer
set search_path = public
as $$
  select r.email_canonical,
         count(*)::int as copies,
         array_agg(r.id order by r.created_at) as ids
    from registrants r
   where r.webinar_id = p_webinar_id
     and not r.is_test
     and r.email_canonical is not null
   group by r.email_canonical
  having count(*) > 1
   order by count(*) desc;
$$;

revoke all on function public.duplicate_registrants(uuid) from public, anon;
grant execute on function public.duplicate_registrants(uuid) to authenticated, service_role;
