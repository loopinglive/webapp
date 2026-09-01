# Loopinglive — Phase 6 Build Prompt
## Analytics Dashboard

---

You are building Phase 6 of Loopinglive — a premium fake-live webinar SaaS platform. Phases 1 through 5 are already built, deployed, and running against live Supabase, Cloudinary and Resend.

Phase 6 turns the data those phases have been quietly accumulating into three dashboards: per-webinar analytics for the host, per-session analytics for diagnosing a single run, and platform-wide analytics for the Loopinglive owner.

---

## WHAT IS ALREADY BUILT (DO NOT REBUILD)

- `/webinar/[webinarId]/register`, `/waiting-room`, `/watch`, `/thank-you`, `/ended` — the attendee flow
- `/replay/[token]` — replay player with its own watch tracking
- `/admin/live/[sessionId]` — admin live panel
- `/admin/dashboard`, `/admin/webinar/[webinarId]/*` — setup, registration builder, attendees, automation
- All Supabase tables through migration `0011`
- Four pg_cron jobs driving sessions, automation, session endings and re-engagement
- Design system: background `#0A0A0F`, surface `#12121A`, accent `#6C47FF`, secondary `#00D4FF`, font Inter

---

## READ THIS BEFORE WRITING ANY CODE

Three of the metrics on the wish list **cannot be produced from existing data**. Two need capture added before any chart will show anything, and one depends on a system that does not exist until Phase 7. Building the charts first would produce dashboards that look finished and are empty.

### Already answerable — no new capture needed

| Metric | Source |
|---|---|
| Registrations / attendees over time | `registrants.created_at`, `attended`, `last_attended_at` |
| No-show rate | `attendee_segments` where segment = `NO_SHOW` |
| Average watch time | `registrants.watch_seconds`, `watch_percentage` |
| **Watch depth curve** | `registrants.watch_percentage` — retention at `x%` is simply `count(watch_percentage >= x) / attendees`. A smooth curve at any resolution, from a column that already exists. |
| Offer click-through | `registrants.clicked_offer`, `offer_clicked_at` |
| Conversion rate | `registrants.bought` |
| **Viewer count over session time** | `attendee_events` already logs `joined_session` and `left_session` with timestamps — concurrency is reconstructable historically, not just live |
| **Chat activity per minute** | `live_chat_messages.sent_at`, with `is_real_user` to separate real from scripted |
| Offer click timing | `attendee_events` where `event_type = 'clicked_offer'` |
| Source breakdown | `attendee_sources.utm_source`, `utm_medium`, `utm_campaign`, `referrer_url` |
| Session comparison / best time slots | `webinar_sessions.starts_at` joined to registrant outcomes |
| Messages sent by channel | `scheduled_messages.status`, `channel` |

### Must start capturing — charts stay empty for historical data

**Device breakdown (mobile vs desktop).** Nothing anywhere records a user agent. Add capture at registration and at room entry, and state plainly in the UI that the breakdown only covers registrants from the moment capture went live.

**Country breakdown.** `registrants.country_code` exists, but it is the country the attendee picked for their *phone number* — a decent proxy, not where they joined from. Capture the real thing from the `x-vercel-ip-country` header and keep both. Label them differently in the UI; conflating a dialling code with a geo-IP result is a quiet lie.

### Blocked until Phase 7

**MRR, ARR, churn, free-to-paid conversion, new signups.** These describe *host subscriptions*. There are no plans, no subscriptions and no Stripe integration until Phase 7 — `webinars.owner_id` points at a Supabase auth user with no billing state attached.

Build the platform dashboard with these tiles present and explicitly marked *Available in Phase 7*, wired to a function that returns null. Do not invent placeholder numbers, and do not silently omit the tiles — the owner should be able to see the shape of the finished dashboard.

**Revenue per webinar** is a softer version of the same problem: `bought` is a boolean with no amount attached. Phase 6 adds price and a purchases ledger (below) so revenue is real from now on, but historical purchases have no value and must be reported as "unpriced".

---

## NEW DATABASE TABLES

### purchases

`bought` being a boolean is why revenue cannot be reported. This gives every purchase an amount, a currency, and a provenance.

```sql
create table purchases (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  session_id uuid references webinar_sessions(id) on delete set null,
  registrant_id uuid references registrants(id) on delete cascade,
  offer_id uuid references webinar_offers(id) on delete set null,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  source text not null default 'manual',      -- 'manual' | 'internal' | 'stripe'
  external_reference text,
  created_at timestamptz default now(),
  unique (registrant_id, offer_id)
);
```

### session_snapshots

Live viewer count is currently computed on demand and thrown away. Snapshots make the during-session curve reconstructable even for sessions that ran while nobody was watching the admin panel.

```sql
create table session_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references webinar_sessions(id) on delete cascade,
  captured_at timestamptz default now(),
  video_offset_seconds integer not null,
  viewers integer default 0,
  real_viewers integer default 0,
  chat_messages integer default 0,
  unique (session_id, video_offset_seconds)
);
```

### webinar_daily_stats

Rollups. A dashboard that runs a dozen aggregate queries across every registrant on every page load will be fine at 100 rows and unusable at 100,000.

```sql
create table webinar_daily_stats (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id) on delete cascade,
  day date not null,
  registrations integer default 0,
  attendees integer default 0,
  no_shows integer default 0,
  avg_watch_percentage numeric(5,2) default 0,
  avg_watch_seconds integer default 0,
  offer_clicks integer default 0,
  purchases integer default 0,
  revenue_cents integer default 0,
  computed_at timestamptz default now(),
  unique (webinar_id, day)
);
```

### platform_daily_stats

```sql
create table platform_daily_stats (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  webinars_total integer default 0,
  webinars_published integer default 0,
  registrations integer default 0,
  attendees integer default 0,
  purchases integer default 0,
  revenue_cents integer default 0,
  emails_sent integer default 0,
  sms_sent integer default 0,
  whatsapp_sent integer default 0,
  new_hosts integer default 0,
  computed_at timestamptz default now()
);
```

RLS on all four. Analytics is host-scoped and revenue-bearing — no anon policies; everything is served through admin routes on the service role.

---

## UPDATES TO EXISTING TABLES

```sql
alter table registrants
  add column if not exists device_type text,        -- 'mobile' | 'tablet' | 'desktop'
  add column if not exists browser text,
  add column if not exists os text,
  add column if not exists ip_country text;         -- geo-IP, distinct from country_code

alter table webinar_offers
  add column if not exists price_cents integer default 0,
  add column if not exists currency text default 'USD';
```

Add `price_cents` and `currency` to the offer builder from Phase 3, and an amount field to the manual "mark as bought" flow from Phase 4 — otherwise revenue stays zero even after the schema supports it.

---

## CAPTURE CHANGES

Analytics cannot report what was never recorded. These come first.

**`lib/device.ts`** — parse a user agent into `{ deviceType, browser, os }`. Keep it small and dependency-free; a full UA library is not worth the bundle for three fields.

**Registration** (`/api/webinar/[webinarId]/register`) — read `user-agent` and `x-vercel-ip-country` from the request headers and store them on the registrant. Both server-side; do not trust a client-supplied value.

**Room entry** (`/api/webinar/[webinarId]/attendance`, `action: 'join'`) — backfill device fields if registration missed them. Someone can register on a phone and watch on a laptop; the join is the one that matters for a viewing-device chart, so record it there and label the chart accordingly.

**Session snapshots** — extend the existing every-minute automation tick, or add a pg_cron job, that writes a `session_snapshots` row for each live session: current viewers, real viewers, and messages in the last minute.

---

## ROLLUP STRATEGY

Follow the pattern already established in Phases 5: the work happens in Postgres, driven by `pg_cron`, configured through `app_config`.

- `public.rollup_webinar_stats(p_day date)` — recomputes `webinar_daily_stats` for a day
- `public.rollup_platform_stats(p_day date)` — recomputes `platform_daily_stats`
- One `pg_cron` job hourly, recomputing **today and yesterday** (late-arriving events, timezone edges)
- Both `security definer`, `execute` revoked from `anon` and `authenticated`

Live dashboards read rollups for anything older than today and query directly for today, so the numbers are never stale for the session currently running.

---

## NEW FOLDER STRUCTURE ADDITIONS

```
app/
├── admin/
│   ├── analytics/
│   │   └── page.tsx                                -- platform-wide (super admin)
│   └── webinar/
│       └── [webinarId]/
│           └── analytics/
│               ├── page.tsx                        -- per-webinar
│               └── [sessionId]/
│                   └── page.tsx                    -- per-session
├── api/
│   └── admin/
│       └── analytics/
│           ├── webinar/route.ts                    -- per-webinar aggregate
│           ├── session/route.ts                    -- per-session timeline
│           ├── platform/route.ts                   -- platform-wide
│           └── export/route.ts                     -- CSV of whatever is on screen

components/
├── analytics/
│   ├── AnalyticsShell.tsx                          -- header, date range, export
│   ├── DateRangePicker.tsx                         -- 7d / 30d / 90d / all / custom
│   ├── StatTile.tsx                                -- one number, delta, sparkline
│   ├── StatRow.tsx                                 -- the row of tiles
│   ├── charts/
│   │   ├── ChartFrame.tsx                          -- title, legend, empty state, tooltip shell
│   │   ├── TimeSeriesChart.tsx                     -- registrations / attendees over time
│   │   ├── RetentionCurve.tsx                      -- watch depth, with drop-off markers
│   │   ├── ViewerTimeline.tsx                      -- concurrency during a session
│   │   ├── ChatActivityChart.tsx                   -- messages per minute
│   │   ├── FunnelChart.tsx                         -- registered → attended → clicked → bought
│   │   ├── BreakdownBars.tsx                       -- source / device / country
│   │   └── SessionComparison.tsx                   -- session-by-session table + bars
│   ├── EmptyMetric.tsx                             -- "not captured before <date>" / "Phase 7"
│   └── platform/
│       ├── PlatformStats.tsx
│       ├── TopWebinars.tsx
│       └── RevenueBreakdown.tsx

hooks/
├── useWebinarAnalytics.ts
├── useSessionAnalytics.ts
└── usePlatformAnalytics.ts

lib/
├── device.ts                                       -- user agent → device, browser, os
└── analytics/
    ├── queries.ts                                  -- server-side aggregation
    └── format.ts                                   -- percentages, durations, currency
```

---

## FEATURE 1: PER-WEBINAR ANALYTICS

Route: `/admin/webinar/[webinarId]/analytics`

Add **Analytics** to the webinar sidebar. (Phase 5 shipped three pages with no navigation to them — do not repeat that.)

**Header row.** Date range picker (7d / 30d / 90d / All / custom), export button, and a note of when device and country capture began.

**Stat tiles**, each with the value, the change against the previous equivalent period, and a sparkline:
Registrations · Attendees · No-show rate · Average watch · Offer CTR · Conversion · Revenue

**Charts:**

1. **Registrations and attendees over time** — two series on one time axis, daily buckets (hourly if the range is under 3 days).
2. **Watch depth curve** — retention from 0–100% of the video. Mark the steepest drop and annotate it: *"Biggest drop-off at 34% — around 12:40 into the video."* The number is the insight; the chart is how you find it.
3. **Funnel** — Registered → Attended → Watched 50%+ → Clicked offer → Bought, with the conversion rate between each pair.
4. **Source breakdown** — horizontal bars by `utm_source`, with direct/unknown grouped honestly as "No source recorded" rather than being dropped.
5. **Device breakdown** — mobile / tablet / desktop, with the capture-start caveat inline.
6. **Country breakdown** — geo-IP with declared phone country as a secondary series, clearly labelled as two different things.
7. **Session comparison** — a table of every session: date, time slot, registrations, attendance rate, average watch, conversion. Sortable. Highlight the best performer.
8. **Best time slots** — attendance rate and conversion aggregated by day-of-week and hour. A small heatmap grid is the right form here.

Every session row links to that session's own page.

---

## FEATURE 2: PER-SESSION ANALYTICS

Route: `/admin/webinar/[webinarId]/analytics/[sessionId]`

One run of the webinar, diagnosed minute by minute. Everything on this page shares a single x-axis: **video offset**, not wall-clock. That is what makes the charts comparable to each other and to the timed-comment editor from Phase 3.

1. **Viewer count over session time** — concurrency reconstructed from `joined_session` / `left_session` events, or read from `session_snapshots` where they exist.
2. **Chat activity** — messages per minute, real and scripted as separate series. The gap between them is a genuine engagement signal.
3. **Drop-off points** — where viewers left, overlaid on the viewer curve. Call out the three worst moments with their timecodes.
4. **Offer click timing** — a histogram of when clicks happened relative to the offer's reveal. Answers whether the trigger is placed well.
5. **Peak engagement** — the moments with the highest combined chat rate and reaction volume, listed with timecodes and a link that seeks the Phase 3 comment editor to that point.

**Attendee list for this session**, filtered by segment, reusing the Phase 4 table component rather than a new one.

---

## FEATURE 3: PLATFORM-WIDE ANALYTICS

Route: `/admin/analytics` — super admin only, gated by the same `getAdminUser()` check every other admin route uses.

**Available now:**
Total webinars (and how many published) · Total registrants and attendees platform-wide · Total messages sent, split by email / SMS / WhatsApp · Platform revenue from the `purchases` ledger · Top performing webinars, ranked by conversion with a minimum-attendee threshold so a 1-of-1 webinar does not top the chart · Registrations and attendees over time across all webinars

**Marked "Available in Phase 7":**
MRR · ARR · New signups per day/week/month · Churn rate · Free-to-paid conversion

Render those tiles in their real positions, greyed, with the label. The dashboard should read as complete-but-pending rather than broken.

---

## CHARTS AND DESIGN

Install **Recharts**. Hand-rolled SVG was right for the timeline scrubber in Phase 3 because it needed drag behaviour no library provides; these are conventional charts and a library is the correct trade.

Read the `dataviz` skill before writing the first chart. Non-negotiables:

- **One categorical palette across every chart.** A source named "facebook" is the same colour on every page it appears.
- **Sequential scales for the heatmap**, not the categorical palette.
- Semantic colour keeps its meaning from the segment system: `#00C851` bought, `#FFD93D` clicked offer, `#FF9500` no-show, `#FF3B3B` failure.
- Grid lines `#1E1E2E`, axis labels `#A0A0B0`, tooltips on `#12121A` with a hairline border.
- Every chart needs a real empty state. "No data yet" is a design element, not a fallback.
- Every chart scrolls inside its own container on mobile; the page never scrolls sideways.
- Numbers are tabular-figure aligned. A dashboard where digits jump as they update looks broken.

---

## API ROUTES

```
GET /api/admin/analytics/webinar?webinarId&from&to
  Tiles, time series, retention curve, funnel, source/device/country breakdowns,
  session comparison. Rollups for closed days, live query for today.

GET /api/admin/analytics/session?sessionId
  Viewer timeline, chat activity, drop-off points, offer click histogram,
  peak moments. All on the video-offset axis.

GET /api/admin/analytics/platform?from&to
  Platform totals, message counts, revenue, top webinars.
  Subscription metrics return null with a `pending: 'phase-7'` marker.

GET /api/admin/analytics/export?scope=webinar|session|platform&…
  CSV. Same formula-injection guard and UTF-8 BOM as the Phase 4 and 5 exports.
```

All four behind `requireAdmin()`.

---

## IMPORTANT BEHAVIOUR RULES

1. **Never fabricate a number.** A metric with no data shows an empty state naming *why* — not captured yet, no sessions in range, or waiting on Phase 7. A zero and an unknown are different facts and must look different.
2. **Label declared country and geo-IP country separately.** They disagree often and mean different things.
3. Percentages need their denominator visible on hover. "34% conversion" from 3 attendees is noise.
4. Rollups are recomputed, never incremented. Recomputing yesterday and today every hour is cheap and self-healing; incremental counters drift and there is no way to tell that they have.
5. Today's numbers come from a live query, not the rollup — a host watching a session in progress must see it move.
6. Analytics is read-only. No route in Phase 6 writes to `registrants`, `attendee_events` or any Phase 1–5 table except the new capture fields.
7. Exports respect the active filters and date range, and say so in the filename.
8. The date range lives in the URL, so a host can share a link to what they are looking at.

---

## WHAT NOT TO BUILD IN PHASE 6

- Stripe, plans, subscriptions or the upgrade flow (Phase 7)
- Super admin account management, impersonation or feature flags (Phase 7)
- Public Loopinglive landing page (Phase 7)
- Affiliate system (Phase 7)
- Zapier and third-party integrations (Phase 8)
- Scheduled or emailed analytics reports

---

## TESTING PHASE 6

1. Seed a webinar with several completed sessions and a spread of watch percentages.
2. Open `/admin/webinar/[id]/analytics` — confirm tiles, and that each matches a hand-run SQL count.
3. Confirm the retention curve is monotonically decreasing. If it rises at any point the query is wrong.
4. Confirm the funnel never widens between stages.
5. Register from a phone and a laptop; confirm the device breakdown separates them and that older registrants show as "not captured".
6. Register with `?utm_source=facebook`; confirm it lands in the source breakdown.
7. Open a session page and confirm the viewer curve matches the `joined_session` / `left_session` events.
8. Confirm chat activity peaks line up with timed comment clusters from Phase 3.
9. Mark a purchase with an amount; confirm revenue appears on both the webinar and platform dashboards.
10. Open `/admin/analytics`; confirm the Phase 7 tiles are visibly pending, not zero.
11. Export at each scope; confirm the CSV matches what is on screen.
12. Change the date range; confirm the URL updates and a reload restores the same view.
13. Force the hourly rollup by hand and confirm the numbers do not change — recomputation must be idempotent.
14. Load a webinar with no sessions and confirm every chart shows its empty state rather than an error.

---

## DELIVERABLES FOR PHASE 6

1. Device, browser, OS and geo-IP country captured at registration and at room entry
2. `purchases` ledger with amounts, and price fields on offers wired into the Phase 3 builder and the Phase 4 manual-bought flow
3. Hourly Postgres rollups for webinar and platform stats, recomputing today and yesterday
4. Per-webinar dashboard: tiles with period deltas, time series, retention curve with annotated drop-off, funnel, source / device / country breakdowns
5. Session comparison table and a day-of-week × hour heatmap identifying the best time slots
6. Per-session dashboard on a video-offset axis: viewer timeline, chat activity, drop-off points, offer click timing, peak moments
7. Platform dashboard with everything currently derivable, and Phase 7 metrics visibly pending rather than faked
8. CSV export at every scope, filter-aware
9. Analytics reachable from the webinar sidebar and the admin dashboard
10. Every chart has a real empty state that explains itself
11. Date range in the URL and shareable
12. Types, lint and production build clean; every number verified against a hand-run query before the phase is called done

---

Start with capture — device, geo and the purchases ledger — because nothing downstream can be verified until data is flowing. Then the rollups and their cron job. Then the per-webinar dashboard, then per-session, then platform-wide last, since it is the one most affected by Phase 7 landing.
