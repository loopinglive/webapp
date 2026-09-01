-- Loopinglive — Phase 1 test data.
-- Run after 0001_phase1_schema.sql. Re-runnable: it clears its own fixtures first.
--
-- The session is created 2 MINUTES FROM NOW so you can watch the countdown in
-- the waiting room and get auto-redirected into the room. Re-run this file
-- whenever you want a fresh session to test against.

do $$
declare
  v_webinar_id uuid;
  v_schedule_id uuid;
  v_session_id uuid;
  v_starts_at timestamptz := now() + interval '2 minutes';
  v_duration integer := 596; -- seconds; matches the sample video below
  p_amara uuid; p_tom uuid; p_priya uuid; p_dee uuid; p_marc uuid;
  p_nadia uuid; p_kwame uuid; p_lena uuid; p_ravi uuid; p_sofia uuid;
begin
  -- Fresh slate for the demo fixture.
  delete from webinars where title = 'The 3-Offer Framework';

  insert into webinars (
    title, description, topic, offer_description, status,
    video_url, video_duration_seconds, thumbnail_url
  )
  values (
    'The 3-Offer Framework',
    'How coaches and course creators build one offer that sells while they sleep — the exact structure, the pricing ladder, and the follow-up that closes.',
    'Building a single high-converting offer for coaches and course creators',
    'The Complete Sales System — a $997 course covering the offer structure, pricing ladder, and follow-up sequences taught in this session.',
    'published',
    -- Swap for your Cloudinary URL:
    -- https://res.cloudinary.com/<cloud>/video/upload/q_auto,f_auto/<public_id>.mp4
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    v_duration,
    null
  )
  returning id into v_webinar_id;

  insert into webinar_schedules (webinar_id, scheduled_at, timezone, is_recurring, recurrence_pattern, recurrence_time)
  values (v_webinar_id, v_starts_at, 'UTC', true, 'daily', '20:00')
  returning id into v_schedule_id;

  insert into webinar_sessions (webinar_id, schedule_id, starts_at, ends_at, status)
  values (v_webinar_id, v_schedule_id, v_starts_at, v_starts_at + make_interval(secs => v_duration), 'scheduled')
  returning id into v_session_id;

  -- ─── Personas ──────────────────────────────────────────────────────────────
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Amara Okafor', 'Lagos')      returning id into p_amara;
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Tom Bracken', 'Manchester')  returning id into p_tom;
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Priya Raman', 'Bangalore')   returning id into p_priya;
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Dee Coleman', 'Atlanta')     returning id into p_dee;
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Marc Lefèvre', 'Paris')      returning id into p_marc;
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Nadia Haddad', 'Dubai')      returning id into p_nadia;
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Kwame Mensah', 'Accra')      returning id into p_kwame;
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Lena Fischer', 'Berlin')     returning id into p_lena;
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Ravi Shah', 'Toronto')       returning id into p_ravi;
  insert into fake_personas (webinar_id, name, location) values
    (v_webinar_id, 'Sofia Marchetti', 'Milan')   returning id into p_sofia;

  -- ─── Timed comments (video offsets in seconds) ─────────────────────────────
  insert into timed_comments (webinar_id, persona_id, content, video_offset_seconds) values
    (v_webinar_id, p_amara,  'Joining from Lagos 🇳🇬', 8),
    (v_webinar_id, p_tom,    'here we go', 14),
    (v_webinar_id, p_priya,  'good evening everyone', 21),
    (v_webinar_id, p_dee,    'second time watching this, took notes last time', 29),
    (v_webinar_id, p_marc,   'Paris here, 1am but worth it', 38),
    (v_webinar_id, p_nadia,  'can you hear us ok?', 47),
    (v_webinar_id, p_kwame,  'sound is perfect 👌', 55),
    (v_webinar_id, p_lena,   'been waiting for this one', 68),
    (v_webinar_id, p_ravi,   'does this work for a service business?', 82),
    (v_webinar_id, p_sofia,  'taking notes already', 96),
    (v_webinar_id, p_amara,  'this is exactly my problem right now', 118),
    (v_webinar_id, p_tom,    'the pricing ladder slide 🔥', 137),
    (v_webinar_id, p_priya,  'wait can you go back over step 2?', 159),
    (v_webinar_id, p_dee,    'I have been doing this backwards for 2 years', 181),
    (v_webinar_id, p_marc,   'so the offer comes before the audience?', 204),
    (v_webinar_id, p_nadia,  'mind blown honestly', 226),
    (v_webinar_id, p_kwame,  'screenshotting this one', 248),
    (v_webinar_id, p_lena,   'how long did this take you to build?', 271),
    (v_webinar_id, p_ravi,   'makes so much more sense now', 295),
    (v_webinar_id, p_sofia,  'is the replay available after?', 318),
    (v_webinar_id, p_amara,  'my whole funnel is wrong 😅', 340),
    (v_webinar_id, p_tom,    'this framework alone is worth it', 363),
    (v_webinar_id, p_priya,  'what if I have no list yet?', 386),
    (v_webinar_id, p_dee,    'starting this tomorrow morning', 409),
    (v_webinar_id, p_marc,   'the follow-up part is the missing piece', 431),
    (v_webinar_id, p_nadia,  'yes please share the template 🙏', 454),
    (v_webinar_id, p_kwame,  'best hour I have spent this month', 477),
    (v_webinar_id, p_lena,   'signing up as soon as the link drops', 500),
    (v_webinar_id, p_ravi,   'where is the link?', 523),
    (v_webinar_id, p_sofia,  'thank you so much for this ❤️', 552);

  -- ─── Offer (drops 4 minutes in) ────────────────────────────────────────────
  insert into webinar_offers (
    webinar_id, offer_title, offer_description, button_text, button_animation,
    trigger_video_offset_seconds, countdown_enabled, countdown_minutes,
    opens_in, offer_type, external_url
  )
  values (
    v_webinar_id,
    'The Complete Sales System',
    'Everything from today, plus the templates and the follow-up sequences.',
    'Yes! I Want Access Now',
    'pulse',
    240,
    true,
    15,
    'new_tab',
    'external',
    'https://example.com/offer'
  );

  raise notice 'Webinar id: %', v_webinar_id;
  raise notice 'Session id: %  starts at %', v_session_id, v_starts_at;
  raise notice 'Register at: /webinar/%/register', v_webinar_id;
end $$;
