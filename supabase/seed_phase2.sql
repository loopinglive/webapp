-- Loopinglive — Phase 2 test data: Sarah and James.
-- Run after seed.sql. Re-runnable.

do $$
declare
  v_webinar_id uuid;
  v_session_id uuid;
  p_sarah uuid;
  p_james uuid;
begin
  select id into v_webinar_id from webinars where title = 'The 3-Offer Framework' limit 1;

  if v_webinar_id is null then
    raise exception 'Run seed.sql first — no demo webinar found.';
  end if;

  select id into v_session_id
  from webinar_sessions
  where webinar_id = v_webinar_id
  order by starts_at desc
  limit 1;

  delete from ai_personas where webinar_id = v_webinar_id;

  insert into ai_personas
    (webinar_id, persona_name, personality_brief, fake_comment_reply_percentage)
  values (
    v_webinar_id,
    'Sarah',
    'Warm and encouraging. Uses the occasional emoji but never more than one per message. Celebrates small wins, reassures people who sound behind or overwhelmed, and often ends on a question that keeps them engaged. Writes the way a friendly community manager types — lowercase starts are fine, contractions always.',
    50
  )
  returning id into p_sarah;

  insert into ai_personas
    (webinar_id, persona_name, personality_brief, fake_comment_reply_percentage)
  values (
    v_webinar_id,
    'James',
    'Direct and knowledgeable. No fluff, no emojis, no exclamation marks. Answers the actual question in one or two sentences and moves on. Handles scepticism by conceding the fair part of the objection first, then reframing. Sounds like an experienced operator who has run this playbook himself.',
    50
  )
  returning id into p_james;

  if v_session_id is not null then
    insert into persona_mode (session_id, ai_persona_id, mode)
    values (v_session_id, p_sarah, 'ai'), (v_session_id, p_james, 'ai')
    on conflict (session_id, ai_persona_id) do update set mode = 'ai';
  end if;

  raise notice 'Sarah: %', p_sarah;
  raise notice 'James: %', p_james;
  raise notice 'Admin panel: /admin/live/%', v_session_id;
end $$;
