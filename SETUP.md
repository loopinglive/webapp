# Loopinglive — running Phase 1

## 1. Supabase

Create a project at [supabase.com](https://supabase.com), then in the SQL editor run, in order:

1. `supabase/migrations/0001_phase1_schema.sql` — tables, indexes, RLS, Realtime
2. `supabase/migrations/0002_phase2_ai_admin.sql` — AI personas, replies, admin
   presence, persona modes
3. `supabase/migrations/0003_offers.sql` — the room's offer button
4. `supabase/migrations/0004_phase3_setup.sql` — setup columns, engagement
   tables, and the full offer shape (this **replaces** the table from 0003)
5. `supabase/migrations/0005_poll_responses.sql` — poll answers
6. `supabase/seed.sql` — one webinar, ten personas, thirty timed comments, an
   offer that drops 4 minutes in, and a session starting **two minutes from now**
7. `supabase/seed_phase2.sql` — Sarah and James, both in AI mode

The seed prints the webinar id in the notices pane. Re-run `seed.sql` any time
you want a fresh session to test against.

## 2. Environment

Fill in `.env.local` from **Project settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Cloudinary values are only needed once you upload your own video (Phase 3). The
seed points at a public sample clip so the room works without them.

For the AI personas and the admin panel:

```
ANTHROPIC_API_KEY=<your key>
CLAUDE_MODEL=claude-sonnet-4-6      # optional
NEXT_PUBLIC_ADMIN_EMAIL=<the email you sign in with>
```

`NEXT_PUBLIC_ADMIN_EMAIL` names the admin; it does not authorise anyone. Every
admin route re-checks the signed Supabase session server-side, so sign up at
`/signup` with that exact address before opening the panel.

## 3. Run

```bash
npm run dev
```

Open `/webinar/<webinar-id>/register`, register, and you land in the waiting
room. When the countdown hits zero you are moved into the room, the video seeks
to the session position, and the persona comments start dropping.

To watch it behave like a real audience, open the room in a second browser
(or a private window) and register as someone else — both windows see each
other's messages over Realtime.

## Testing the join-late path

Edit the session so it started in the past:

```sql
update webinar_sessions
set starts_at = now() - interval '4 minutes'
where id = '<session id>';
```

Reload the room: the video opens four minutes in, and the chat is already
carrying the four minutes of conversation that "happened" while you were away.

## Route map

| Route | Purpose |
| --- | --- |
| `/webinar/[webinarId]/register` | Registration page |
| `/webinar/[webinarId]/waiting-room` | Countdown + live joiner feed |
| `/webinar/[webinarId]/watch` | The room |
| `/api/webinar/[webinarId]/session` | Current or next session + server clock |
| `/api/webinar/[webinarId]/register` | Creates the registrant |
| `/api/webinar/[webinarId]/chat` | Chat history (GET) and real messages (POST) |
| `/api/webinar/[webinarId]/chat/sync` | Drops due persona comments, idempotently |
| `/api/webinar/[webinarId]/attendance` | Viewer count (GET), join/progress/leave (POST) |
| `/api/webinar/[webinarId]/joiners` | Waiting-room social proof, PII-stripped |
| `/api/webinar/timed-comments` | Every scripted comment for a webinar |
| `/webinar/[webinarId]/thank-you` | Where the room sends viewers when it ends |
| `/api/webinar/[webinarId]/offer` | The offer (GET) and click tracking (POST) |
| `/admin/live/[sessionId]` | Admin live panel |
| `/api/ai/reply` | Generates one persona reply, claimed so it runs once |
| `/api/ai/toggle-mode` | Flips a persona between AI and human mode |
| `/api/admin/session` | Panel bootstrap (GET) and admin presence (POST) |
| `/api/admin/messages` | Filtered message feed for the initial load |
| `/api/admin/manual-reply` | Admin posts a reply under a persona's name |
| `/admin/dashboard` | Every webinar, with stats |
| `/admin/webinar/new` | Three-step creation flow |
| `/admin/webinar/[id]` | Overview, checklist, publish gate, danger zone |
| `/admin/webinar/[id]/comments` | Timeline scrubber with draggable pins |
| `/api/admin/upload` | Signed upload params (bytes go direct to storage) |
| `/api/admin/upload/confirm` | Verifies the asset and records it |
| `/api/admin/ai-test` | Dry-runs a moderator against the real prompt |

## Cloudinary

Uploads are signed server-side and sent **direct from the browser**, so no
unsigned upload preset is needed — `CLOUDINARY_UPLOAD_PRESET` is unused. Files
land in `loopinglive/videos` and `loopinglive/assets`.

The admin UI never renders a storage URL. Video, thumbnail and handout files are
referenced only by the webinar's own labels.

## Recurring sessions

A schedule is a rule; a session is the instance the room points at. Rolling one
into the other happens **inside Postgres**, on `pg_cron`, every five minutes —
see `0007_session_scheduler.sql`. It flips statuses to `live`/`ended`, retires
spent one-time schedules, and creates the next session for every published
webinar.

This lives in the database rather than on a web cron for three reasons: it needs
no shared secret, it keeps running if the web host is down, and Vercel's Hobby
plan caps cron jobs at once per day.

`public.next_occurrence()` is the authoritative recurrence rule. The app calls
`ensure_upcoming_session()` rather than reimplementing it, and the room also
calls it lazily whenever it asks for a session and none is pending — so a fresh
clone works before the job has ever fired.

Check or change the job:

```sql
select jobname, schedule, active from cron.job;
select public.roll_sessions_forward();   -- run it by hand
```

`/api/cron/sessions` is a manual trigger for the same sweep, open to a signed-in
admin or a bearer `CRON_SECRET`.

## Testing Phase 2

The seed prints the admin panel URL. With the room open in one window and
`/admin/live/<session id>` in another:

- A message you send as a viewer shows up highlighted in the panel, and a reply
  from Sarah or James lands in both windows 2–8 seconds later.
- Flip Sarah to Human mode. Messages that fall to her now stay unanswered and
  collect in the **Unanswered** filter.
- Hover any message, hit **Reply**, pick Sarah, type, send — it appears in the
  viewer's chat as Sarah, with no way to tell it from an AI reply.
- Flip her back to AI mode; the queue picks the unanswered ones back up within
  about ten seconds.
