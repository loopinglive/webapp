-- Loopinglive — analytics rollups.
--
-- Recompute, never increment. Recomputing two days every hour is cheap and
-- self-healing; incremental counters drift and nothing tells you they have.
--
-- Dashboards read these for closed days and query live for today, so a session
-- in progress still moves.

create or replace function public.rollup_webinar_stats(p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  insert into webinar_daily_stats (
    webinar_id, day, registrations, attendees, no_shows,
    avg_watch_percentage, avg_watch_seconds, offer_clicks,
    purchases, revenue_cents, computed_at
  )
  select
    w.id,
    p_day,
    coalesce(reg.n, 0),
    coalesce(att.n, 0),
    coalesce(noshow.n, 0),
    coalesce(att.avg_pct, 0),
    coalesce(att.avg_secs, 0),
    coalesce(clicks.n, 0),
    coalesce(buys.n, 0),
    coalesce(buys.cents, 0),
    now()
  from webinars w

  -- Registrations created on the day.
  left join lateral (
    select count(*)::int n
      from registrants r
     where r.webinar_id = w.id
       and r.created_at >= p_day and r.created_at < p_day + 1
  ) reg on true

  -- Attendance measured from the event log, which is dated, rather than from
  -- last_attended_at, which only remembers the most recent visit.
  left join lateral (
    select count(distinct r.id)::int n,
           round(avg(r.watch_percentage), 2) avg_pct,
           round(avg(r.watch_seconds))::int avg_secs
      from attendee_events e
      join registrants r on r.id = e.registrant_id
     where r.webinar_id = w.id
       and e.event_type = 'joined_session'
       and e.created_at >= p_day and e.created_at < p_day + 1
  ) att on true

  -- Registered for a session that ran on the day and never turned up.
  left join lateral (
    select count(*)::int n
      from registrants r
      join webinar_sessions s on s.id = r.session_id
     where r.webinar_id = w.id
       and r.attended = false
       and s.starts_at >= p_day and s.starts_at < p_day + 1
       and s.starts_at < now()
  ) noshow on true

  left join lateral (
    select count(*)::int n
      from registrants r
     where r.webinar_id = w.id
       and r.offer_clicked_at >= p_day and r.offer_clicked_at < p_day + 1
  ) clicks on true

  left join lateral (
    select count(*)::int n, coalesce(sum(p.amount_cents), 0)::int cents
      from purchases p
     where p.webinar_id = w.id
       and p.created_at >= p_day and p.created_at < p_day + 1
  ) buys on true

  on conflict (webinar_id, day) do update set
    registrations        = excluded.registrations,
    attendees            = excluded.attendees,
    no_shows             = excluded.no_shows,
    avg_watch_percentage = excluded.avg_watch_percentage,
    avg_watch_seconds    = excluded.avg_watch_seconds,
    offer_clicks         = excluded.offer_clicks,
    purchases            = excluded.purchases,
    revenue_cents        = excluded.revenue_cents,
    computed_at          = now();

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

create or replace function public.rollup_platform_stats(p_day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into platform_daily_stats (
    day, webinars_total, webinars_published, registrations, attendees,
    purchases, revenue_cents, emails_sent, sms_sent, whatsapp_sent,
    new_hosts, computed_at
  )
  select
    p_day,
    (select count(*)::int from webinars),
    (select count(*)::int from webinars where status = 'published'),
    (select count(*)::int from registrants
      where created_at >= p_day and created_at < p_day + 1),
    (select count(distinct registrant_id)::int from attendee_events
      where event_type = 'joined_session'
        and created_at >= p_day and created_at < p_day + 1),
    (select count(*)::int from purchases
      where created_at >= p_day and created_at < p_day + 1),
    (select coalesce(sum(amount_cents), 0)::int from purchases
      where created_at >= p_day and created_at < p_day + 1),
    (select count(*)::int from scheduled_messages
      where status = 'sent' and channel = 'email'
        and sent_at >= p_day and sent_at < p_day + 1),
    (select count(*)::int from scheduled_messages
      where status = 'sent' and channel = 'sms'
        and sent_at >= p_day and sent_at < p_day + 1),
    (select count(*)::int from scheduled_messages
      where status = 'sent' and channel = 'whatsapp'
        and sent_at >= p_day and sent_at < p_day + 1),
    -- Hosts are auth users who own a webinar. Real signup counts arrive with
    -- billing in Phase 7; this is the closest honest proxy until then.
    (select count(distinct owner_id)::int from webinars
      where created_at >= p_day and created_at < p_day + 1
        and owner_id is not null),
    now()
  on conflict (day) do update set
    webinars_total     = excluded.webinars_total,
    webinars_published = excluded.webinars_published,
    registrations      = excluded.registrations,
    attendees          = excluded.attendees,
    purchases          = excluded.purchases,
    revenue_cents      = excluded.revenue_cents,
    emails_sent        = excluded.emails_sent,
    sms_sent           = excluded.sms_sent,
    whatsapp_sent      = excluded.whatsapp_sent,
    new_hosts          = excluded.new_hosts,
    computed_at        = now();
end;
$$;

-- ─── Session snapshots ───────────────────────────────────────────────────────
-- Written from Postgres rather than the app: the numbers are already here, and
-- a snapshot that depends on someone having the admin panel open is not a
-- record of the session.

create or replace function public.capture_session_snapshots()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  v_offset integer;
  v_count integer := 0;
begin
  for s in
    select ws.id, ws.starts_at
      from webinar_sessions ws
     where ws.status = 'live'
        or (ws.starts_at <= now() and ws.ends_at > now())
  loop
    v_offset := greatest(0, floor(extract(epoch from (now() - s.starts_at)))::int);

    insert into session_snapshots (
      session_id, video_offset_seconds, viewers, real_viewers, chat_messages
    )
    select
      s.id,
      v_offset,
      (select count(*)::int from registrants r
        where r.session_id = s.id and r.attended and r.left_at is null)
      + (select count(*)::int from fake_personas fp
          join webinar_sessions w2 on w2.id = s.id
         where fp.webinar_id = w2.webinar_id),
      (select count(*)::int from registrants r
        where r.session_id = s.id and r.attended and r.left_at is null),
      (select count(*)::int from live_chat_messages m
        where m.session_id = s.id and m.sent_at > now() - interval '1 minute')
    on conflict (session_id, video_offset_seconds) do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ─── The job ─────────────────────────────────────────────────────────────────

create or replace function public.tick_analytics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Today and yesterday: late events and timezone edges both land in the past.
  perform public.rollup_webinar_stats(current_date);
  perform public.rollup_webinar_stats(current_date - 1);
  perform public.rollup_platform_stats(current_date);
  perform public.rollup_platform_stats(current_date - 1);
end;
$$;

revoke all on function public.rollup_webinar_stats(date) from public, anon, authenticated;
revoke all on function public.rollup_platform_stats(date) from public, anon, authenticated;
revoke all on function public.capture_session_snapshots() from public, anon, authenticated;
revoke all on function public.tick_analytics() from public, anon, authenticated;

grant execute on function public.rollup_webinar_stats(date) to service_role;
grant execute on function public.rollup_platform_stats(date) to service_role;
grant execute on function public.tick_analytics() to service_role;

do $$
begin
  perform cron.unschedule('loopinglive-analytics')
   where exists (select 1 from cron.job where jobname = 'loopinglive-analytics');
  perform cron.unschedule('loopinglive-snapshots')
   where exists (select 1 from cron.job where jobname = 'loopinglive-snapshots');
end $$;

select cron.schedule(
  'loopinglive-analytics',
  '23 * * * *',
  $$select public.tick_analytics()$$
);

-- Snapshots need per-minute resolution to draw a viewer curve.
select cron.schedule(
  'loopinglive-snapshots',
  '* * * * *',
  $$select public.capture_session_snapshots()$$
);
