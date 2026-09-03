-- Subject access and erasure.
-- Run after 0026_schedule_timezone.sql.

/*
 * A registrant can ask for their data, or ask for it to be deleted.
 *
 * Both are rights under GDPR and both have deadlines, and neither was
 * possible: a host receiving one of these requests had no way to answer it
 * short of someone opening a SQL console.
 *
 * Fourteen tables carry a registrant_id. Doing this in the application would
 * mean fourteen queries that have to be kept in step with the schema forever,
 * and the failure mode of forgetting one is the worst kind — a deletion that
 * reports success and leaves data behind.
 */

/*
 * Somewhere to keep a suppression after its person is gone.
 *
 * `unsubscribes` keys on registrant_id and holds no address, so erasing the
 * registrant would take the record of "do not contact me" with it.
 */
alter table unsubscribes
  add column if not exists email_hash text;

create index if not exists unsubscribes_hash_idx
  on unsubscribes (email_hash) where email_hash is not null;

/** Everything held about one person, as one JSON document. */
create or replace function public.export_registrant_data(p_registrant_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'registrant', (
      select to_jsonb(r) from registrants r where r.id = p_registrant_id
    ),
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at)
        from attendee_events e where e.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'chat_messages', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.sent_at)
        from live_chat_messages m where m.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'poll_responses', coalesce((
      select jsonb_agg(to_jsonb(p))
        from poll_responses p where p.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(q))
        from live_questions q where q.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'question_votes', coalesce((
      select jsonb_agg(to_jsonb(v))
        from live_question_votes v where v.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'handout_downloads', coalesce((
      select jsonb_agg(to_jsonb(h))
        from handout_downloads h where h.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'purchases', coalesce((
      select jsonb_agg(to_jsonb(pu))
        from purchases pu where pu.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'messages_sent', coalesce((
      select jsonb_agg(to_jsonb(ml) order by ml.sent_at)
        from message_logs ml where ml.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'messages_scheduled', coalesce((
      select jsonb_agg(to_jsonb(sm))
        from scheduled_messages sm where sm.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'segments', coalesce((
      select jsonb_agg(to_jsonb(seg))
        from attendee_segments seg where seg.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'source', coalesce((
      select jsonb_agg(to_jsonb(src))
        from attendee_sources src where src.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'offer_assignments', coalesce((
      select jsonb_agg(to_jsonb(oa))
        from offer_assignments oa where oa.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'replay_access', coalesce((
      select jsonb_agg(to_jsonb(ra))
        from replay_access ra where ra.registrant_id = p_registrant_id
    ), '[]'::jsonb),
    'unsubscribes', coalesce((
      select jsonb_agg(to_jsonb(un))
        from unsubscribes un where un.registrant_id = p_registrant_id
    ), '[]'::jsonb)
  );
$$;

/*
 * Erasure.
 *
 * Two things this deliberately does not do.
 *
 * It does not delete purchases. A sale is a financial record with its own
 * retention obligations, and the right to erasure does not override them —
 * so the row stays and its link to a person is cut. The same reasoning
 * applies to the unsubscribe record: deleting it would mean forgetting that
 * someone asked not to be contacted, and the next import would mail them
 * again. Forgetting a request not to be contacted is not a privacy win.
 *
 * It does not rely on cascade. Several of these are `on delete set null` or
 * have no constraint at all, so deleting the registrant row would silently
 * orphan them rather than remove them.
 */
create or replace function public.erase_registrant(p_registrant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_webinar uuid;
  v_removed jsonb := '{}'::jsonb;
  v_count int;
begin
  select email, webinar_id into v_email, v_webinar
    from registrants where id = p_registrant_id;

  if not found then
    return jsonb_build_object('error', 'no such registrant');
  end if;

  delete from attendee_events where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('events', v_count);

  delete from live_chat_messages where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('chat_messages', v_count);

  delete from poll_responses where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('poll_responses', v_count);

  delete from live_question_votes where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('question_votes', v_count);

  delete from live_questions where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('questions', v_count);

  delete from handout_downloads where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('handout_downloads', v_count);

  delete from attendee_segments where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('segments', v_count);

  delete from attendee_sources where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('sources', v_count);

  delete from offer_assignments where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('offer_assignments', v_count);

  delete from replay_access where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('replay_access', v_count);

  delete from scheduled_messages where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('messages_scheduled', v_count);

  /*
   * Sent messages are a record of what was sent, not a profile.
   *
   * The link to the person goes, and so does provider_response — that is the
   * raw payload back from Resend or Twilio and it contains the address the
   * message went to. What remains is that a message of some channel was sent
   * at some time, which is a delivery record rather than personal data.
   */
  update message_logs
     set registrant_id = null,
         provider_response = null
   where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('messages_anonymised', v_count);

  -- Kept, unlinked: a sale carries its own retention obligations.
  update purchases set registrant_id = null where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('purchases_unlinked', v_count);

  /*
   * The suppression record outlives the person.
   *
   * Deleting it would mean forgetting that they asked not to be contacted,
   * and the next list import would mail them again — forgetting a request not
   * to be contacted is not a privacy win.
   *
   * The table keys on registrant_id alone, so cutting that link would lose the
   * suppression entirely. The hash added above is what carries it: a future
   * import can test an address against it without the address being readable
   * here, and a hash of an address nobody holds is not a way back to a person.
   */
  update unsubscribes
     set registrant_id = null,
         -- The built-in rather than pgcrypto's digest(): pgcrypto lives in
         -- the extensions schema on Supabase, which is not on this function's
         -- search_path, and sha256() is in pg_catalog and always reachable.
         email_hash = encode(sha256(lower(v_email)::bytea), 'hex')
   where registrant_id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('unsubscribes_hashed', v_count);

  delete from registrants where id = p_registrant_id;
  get diagnostics v_count = row_count;
  v_removed := v_removed || jsonb_build_object('registrant', v_count);

  return jsonb_build_object(
    'erased', true,
    'webinar_id', v_webinar,
    'removed', v_removed
  );
end;
$$;

revoke all on function public.export_registrant_data(uuid) from public, anon;
revoke all on function public.erase_registrant(uuid) from public, anon, authenticated;
grant execute on function public.export_registrant_data(uuid) to authenticated, service_role;
grant execute on function public.erase_registrant(uuid) to service_role;
