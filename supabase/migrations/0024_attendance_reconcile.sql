-- Making the attended flag and the event log agree.
-- Run after 0023_email_canonical.sql.

/*
 * Two sources of truth for the same fact.
 *
 * `registrants.attended` is a flag; `attendee_events` holds a `joined_session`
 * row. Analytics reads the log, the room and the messaging engine read the
 * flag, and they can disagree — the join transition used to be a read followed
 * by a write, so two tabs could both log a join, and a failure between the two
 * writes could produce a flag with no event behind it.
 *
 * The transition is atomic from here on (see the attendance route). This is
 * for the rows written before that.
 */

/** What disagrees, and in which direction. Read-only. */
create or replace function public.attendance_mismatches(p_webinar_id uuid)
returns table (
  registrant_id uuid,
  full_name text,
  email text,
  attended boolean,
  join_events integer,
  problem text
)
language sql
stable
security definer
set search_path = public
as $$
  with events as (
    select registrant_id, count(*)::int as join_events
      from attendee_events
     where event_type = 'joined_session'
     group by registrant_id
  )
  select r.id,
         r.full_name,
         r.email,
         r.attended,
         coalesce(e.join_events, 0),
         case
           when r.attended and coalesce(e.join_events, 0) = 0
             then 'marked as attended with no join event'
           when not r.attended and coalesce(e.join_events, 0) > 0
             then 'has a join event but is not marked as attended'
           else 'joined more than once'
         end
    from registrants r
    left join events e on e.registrant_id = r.id
   where r.webinar_id = p_webinar_id
     and not r.is_test
     and (
       (r.attended and coalesce(e.join_events, 0) = 0)
       or (not r.attended and coalesce(e.join_events, 0) > 0)
       or coalesce(e.join_events, 0) > 1
     )
   order by r.created_at;
$$;

/*
 * Repairs them.
 *
 * The log wins on existence: an event is a record of something that happened
 * at a moment, and the flag is a summary that can be recomputed. So a
 * registrant with a join event is marked attended, and duplicate join events
 * collapse to the earliest.
 *
 * The one case the log does not win is a flag with no event behind it. That
 * row has watch seconds and a join time on it — evidence the person was in the
 * room — so the missing event is written rather than the flag cleared. Erasing
 * a genuine attendance to satisfy a bookkeeping rule would be the worse error.
 */
create or replace function public.reconcile_attendance(p_webinar_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flagged int := 0;
  v_evented int := 0;
  v_deduped int := 0;
begin
  -- A join event but no flag: the flag is a summary, so recompute it.
  update registrants r
     set attended = true,
         last_attended_at = coalesce(r.last_attended_at, e.first_join)
    from (
      select registrant_id, min(created_at) as first_join
        from attendee_events
       where event_type = 'joined_session'
       group by registrant_id
    ) e
   where e.registrant_id = r.id
     and r.webinar_id = p_webinar_id
     and not r.attended;
  get diagnostics v_flagged = row_count;

  -- A flag but no event: write the event from what the row already knows.
  insert into attendee_events (registrant_id, session_id, event_type, created_at)
  select r.id,
         r.session_id,
         'joined_session',
         coalesce(r.joined_at, r.last_attended_at, r.created_at)
    from registrants r
   where r.webinar_id = p_webinar_id
     and r.attended
     and not exists (
       select 1 from attendee_events e
        where e.registrant_id = r.id
          and e.event_type = 'joined_session'
     );
  get diagnostics v_evented = row_count;

  -- Duplicates from the old read-then-write race: keep the earliest.
  delete from attendee_events e
   using (
     select id from (
       select e2.id,
              row_number() over (
                partition by e2.registrant_id order by e2.created_at
              ) as rn
         from attendee_events e2
         join registrants r on r.id = e2.registrant_id
        where e2.event_type = 'joined_session'
          and r.webinar_id = p_webinar_id
     ) ranked
      where rn > 1
   ) extra
   where e.id = extra.id;
  get diagnostics v_deduped = row_count;

  return jsonb_build_object(
    'flagged', v_flagged,
    'events_written', v_evented,
    'duplicates_removed', v_deduped
  );
end;
$$;

revoke all on function public.attendance_mismatches(uuid) from public, anon;
revoke all on function public.reconcile_attendance(uuid) from public, anon, authenticated;
grant execute on function public.attendance_mismatches(uuid) to authenticated, service_role;
grant execute on function public.reconcile_attendance(uuid) to service_role;
