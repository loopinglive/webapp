# Loopinglive — Phase 10 Build Prompt
## Live Webinar Mode

You are building Phase 10 of Loopinglive — a premium fake-live webinar SaaS platform. Phases 1 through 9 are already built and working. Phase 1 built the webinar room. Phase 2 built the AI persona reply system and admin live panel. Phase 3 built the admin webinar setup panel. Phase 4 built the registration page builder and attendee tracking. Phase 5 built the follow-up automation engine. Phase 6 built the analytics dashboard. Phase 7 built billing and the public landing page. Phase 8 built integrations and the public API. Phase 9 was the polish and launch pass.

Phase 10 adds genuine live broadcasting — and, more importantly, makes a live session become an automated one afterwards without the host recording anything separately.

---

## WHAT IS ALREADY BUILT (DO NOT REBUILD)

- The watch room, chat, personas, timed comments, offer button, engagement layer (Phase 1)
- AI persona replies and the admin live panel (Phase 2)
- Webinar setup, video upload, scheduling (Phase 3)
- Registration pages and attendee tracking (Phase 4)
- Follow-up automation across email, SMS, WhatsApp (Phase 5)
- Analytics (Phase 6)
- Billing, plans, affiliates, super admin (Phase 7)
- Integrations, outbound webhooks, public API (Phase 8)
- Toasts, skeletons, empty states, error boundaries, onboarding, security headers (Phase 9)
- Design system: background `#0A0A0F`, surface `#12121A`, accent `#6C47FF`, secondary `#00D4FF`, Inter

**The chat engine is not to be rebuilt.** Live sessions use the same `live_chat_messages` table, the same Supabase Realtime subscription, the same AI persona replies and the same timed comments. A live session is a different *video source*, not a different room.

---

## THE ONE IDEA THAT MATTERS

Everything else in this phase is in service of a single loop:

> **Go live once → the recording becomes the automated webinar → it runs forever.**

A host who has never recorded a video can go live on a Tuesday, and by Wednesday that session is running on a schedule with personas, timed comments and follow-ups. Live mode is not a separate product; it is the on-ramp to the product that already exists.

Build the conversion step first if anything has to be cut.

---

## TECHNOLOGY CHOICE

Use **LiveKit**. Reasons, so the decision is not relitigated later:

- It has a server SDK for minting access tokens, which is the only way to keep room permissions on the server where they belong
- It has **Egress** — server-side recording of a room to a file — which is what makes the conversion step possible at all
- Screen share is a first-class track type rather than a hack
- It is open source and self-hostable, so the platform is not hostage to one vendor's pricing

Daily.co and Agora would also work. Agora would need a separate recording service; Daily's recording is fine but its pricing model is per-participant-minute, which is the wrong shape for webinars with large silent audiences.

**Every part of this must degrade cleanly when LiveKit is not configured.** The platform ran for nine phases without it; a missing `LIVEKIT_API_KEY` must produce a clear message on the backstage screen, not a crash on the watch room.

---

## ENVIRONMENT VARIABLES

```
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_WEBHOOK_KEY=your_livekit_webhook_key
```

---

## NEW DATABASE TABLES

### live_sessions
One row per live broadcast. Separate from `webinar_sessions` because a live session has a lifecycle a scheduled playback does not — backstage, live, ended, processing, converted.

```sql
create table live_sessions (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete set null,
  host_id uuid references user_accounts(id) on delete set null,
  room_name text not null unique,
  status text not null default 'backstage',
  -- backstage | live | ended | processing | converted | failed
  title text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  peak_viewers integer default 0,
  egress_id text,
  recording_url text,
  recording_public_id text,
  converted_webinar_id uuid references webinars(id) on delete set null,
  created_at timestamptz default now()
);
```

### live_segments
What was on screen, and when. This is what makes the recording convertible: a timed comment written against the recording needs to know that minutes 12–18 were a pre-recorded clip.

```sql
create table live_segments (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid references live_sessions(id) on delete cascade,
  kind text not null,           -- camera | screen | recorded_clip
  source_url text,              -- the clip, when kind = recorded_clip
  label text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  offset_seconds integer        -- seconds into the broadcast
);
```

### live_questions
```sql
create table live_questions (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid references live_sessions(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete set null,
  author_name text not null,
  question text not null,
  status text default 'pending',   -- pending | answered | dismissed
  is_featured boolean default false,
  upvotes integer default 0,
  answered_at timestamptz,
  video_offset_seconds integer,
  created_at timestamptz default now()
);
```

### live_question_votes
One vote per person per question, so upvotes mean something.

```sql
create table live_question_votes (
  question_id uuid references live_questions(id) on delete cascade,
  registrant_id uuid references registrants(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (question_id, registrant_id)
);
```

---

## FEATURE 1: BACKSTAGE

Route: `/admin/webinar/[webinarId]/live`

Before anything is broadcast, the host lands backstage. Nobody is watching yet.

- **Camera and microphone preview** with a device picker for each. If permission is denied, say what to do about it rather than showing a black rectangle.
- **A working audio meter.** A silent microphone is the single most common way a webinar fails, and it is silent by definition — the host cannot hear their own problem. Show input level as a live bar.
- **Attendee count building** — how many people are already in the waiting room, updating live. This is the number that makes a host want to start.
- **Session picker** — attach this broadcast to a scheduled session, or run it ad hoc.
- **Go live** — disabled until a camera or screen track is available, with the reason shown.

If LiveKit is not configured, backstage says so plainly and links to where the keys go.

---

## FEATURE 2: BROADCASTING

Once live:

- Camera and microphone publish to the room
- **Screen share** as a second track, toggled independently — sharing a screen must not drop the camera
- Mute, camera off, and end broadcast, all with obvious state
- **Live viewer count** from the room's participant count, not an estimate
- Every state change writes a `live_segments` row

Attendees join as **subscribers only**. Their token grants `canPublish: false`. This is not a UI decision — it is enforced in the token, because a UI-only restriction is not a restriction.

---

## FEATURE 3: HYBRID MODE

The host can play a pre-recorded clip mid-broadcast and come back.

- Pick from videos already uploaded to the webinar
- Playing a clip switches the attendee's view to it and pauses the camera track
- Returning to live resumes the camera
- Each switch writes a segment with its offset, so the recording is annotated

This is the feature that lets a host show a demo, a testimonial, or a walkthrough without screen-sharing a video player and hoping the audio survives.

---

## FEATURE 4: LIVE Q&A

- Attendees submit questions from the watch room
- Questions appear in a host panel with an upvote count
- Host can **answer** (marks it answered, with the video offset recorded), **feature** it to all attendees, or **dismiss** it
- A featured question appears above the chat for everyone
- The recorded offset means a converted replay can surface "the host answered this at 24:10"

Q&A is separate from chat on purpose. Chat is social; Q&A is a queue with a state machine.

---

## FEATURE 5: CONVERT TO AUTOMATED WEBINAR

The point of the whole phase.

When a session ends:
1. LiveKit Egress has been recording the room since it went live
2. The recording is fetched and uploaded to Cloudinary
3. `live_sessions.status` moves `ended → processing → converted`
4. The host sees **"Turn this into an automated webinar"**

One click then:
- Sets the recording as the webinar's `video_url` and duration
- Carries the live chat across as timed comments, at the offsets they were originally sent — **the real conversation becomes the simulated one**
- Carries answered Q&A across as timed comments at their answer offsets
- Leaves personas, schedule, offer and automation for the host to configure as normal

That third point is the one worth getting right. A host who did a good live session has already produced the perfect chat script for its replay, and they wrote it by accident.

---

## FEATURE 6: THE WATCH ROOM, LIVE

The attendee experience changes as little as possible.

- Same chat, same personas, same timed comments, same offer button
- The video element is replaced by a LiveKit subscriber view when the session is live
- A **LIVE** badge that means it this time
- Q&A input alongside chat
- Featured question banner
- If the broadcast drops, say so and reconnect — do not show a frozen frame and let people assume it is their connection

---

## BEHAVIOUR RULES

1. **Live mode is a paid feature.** Free accounts see the backstage screen and an upgrade wall, the same as publishing.
2. **Attendee tokens can never publish.** Enforced server-side in the token grant.
3. **A room is created per live session**, named `webinar_{webinarId}_{liveSessionId}`, so a stale room can never be rejoined.
4. **Recording starts with the broadcast, not with the room.** Nobody wants their backstage microphone test in the replay.
5. **Ending is idempotent.** A host clicking "end" twice, or a webhook arriving late, must not corrupt the session or double-upload the recording.
6. **Conversion never overwrites silently.** If the webinar already has a video, say so and ask.
7. **Failure is visible.** If egress fails, the host is told the session was not recorded — they should not discover it a week later when they try to convert.

---

## TESTING

1. Open backstage without LiveKit configured — a clear message, no crash
2. Configure LiveKit, reload, see camera preview and a moving audio meter
3. Deny camera permission — get an explanation, not a black box
4. See the waiting-room count rise as a second browser registers
5. Go live; the attendee's watch room switches from waiting to live video
6. Toggle screen share; camera stays up
7. Play a recorded clip; attendee sees the clip; return to live
8. Attendee asks a question; it appears in the host panel
9. Feature it; every attendee sees the banner
10. Answer it; it is marked answered with an offset
11. End the broadcast; status moves to processing
12. Recording lands in Cloudinary and status moves to converted
13. Click convert; the webinar has a video and timed comments matching the real chat
14. Publish it and let a scheduled session run — the replay plays the live recording with the real conversation reproduced

---

## DELIVERABLES

1. Backstage with device selection, audio meter and live attendee count
2. Camera, microphone and screen share publishing
3. Attendee subscriber view in the existing watch room
4. Real-time viewer count from room participants
5. Hybrid mode with recorded clips and segment tracking
6. Live Q&A with upvotes, featuring, answering and dismissal
7. Server-side recording via Egress
8. Recording uploaded to Cloudinary on session end
9. One-click conversion to an automated webinar
10. Live chat carried across as timed comments at their original offsets
11. Plan enforcement on going live
12. Clean degradation with no LiveKit credentials
