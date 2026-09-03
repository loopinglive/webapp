# Webinar Engine Hardening — Review

**Where the illusion breaks.**

I went looking for the obvious holes and mostly did not find them — the engine is better defended than I expected. What is left is a smaller, sharper list: **three things that break the illusion for real people on real networks**, one legal exposure worth taking seriously, and a set of gaps that cost conversions rather than credibility.

| | |
|---|---|
| **6** already solid | The defences I expected to be missing are there |
| **3** break the illusion | Not theoretical — these happen on ordinary connections |
| **41** total additions | Across seven areas, ordered by what they cost you |

---

## Built since this review

Kept honest: this section lists only what has been built *and* checked, with
how it was checked. Everything else in the tables below is still outstanding.

### The largest single win, found by accident

Load testing was meant to measure concurrency. It found a region mismatch
instead.

`X-Vercel-Id` read `lhr1::iad1` — requests entered in London and the function
executed in **Washington DC**, while Supabase runs in **eu-central-1**. Every
database query on every page crossed the Atlantic twice. One line in
`vercel.json` pins the functions to `fra1`, beside the database.

Measured on production, before and after, with the same 40-viewer test:

| | before | after |
|---|---|---|
| `/api/health` query | 156–344ms | 46–63ms |
| chat p50 | 276ms | **103ms** |
| chat p95 | 1191ms | **259ms** |
| viewer count p95 | 1235ms | **192ms** |
| session p95 | 1044ms | 603ms |

Chat p95 at forty viewers had been close to the point where one viewer in
twenty sees the room stall. It is now comfortable, and the gain applies to
every query on every page rather than to one endpoint.

`scripts/loadtest.mjs` is how this was measured. It polls what a real viewer's
browser polls, at the intervals it uses, and writes nothing — run it against
production and it costs reads, not rows.

---

### Verified against the production database

| Built | How it was verified |
|---|---|
| **Recurring schedules keep local time** | The bug was worse than predicted: `timezone` had been stored since migration 0001 and never read, so 20:00 ran at 16:00 in New York — wrong by a whole offset for every host outside UTC, permanently, on top of the DST slide. Fixed in the SQL, its TypeScript mirror and the form. **1,500 of 1,500 combinations now agree with the database** across ten zones, both hemispheres' boundaries, the hour that never happens and the hour that happens twice, a half-hour zone and a 45-minute one. |
| **Attendance reconciled with the event log** | The cause was a read-then-write race on the join transition; it is a compare-and-set now. `attendance_mismatches()` found the exact row this review flagged, `reconcile_attendance()` wrote its missing event, and the count is zero. |
| **Overlap protection on schedules** | Exclusion constraint, not an application check — the sessions table is written from three places. Tested in a rolled-back transaction against production: overlap rejected, test run exempt, back-to-back accepted. |
| **Email hygiene and duplicate registration** | Gmail ignores dots and Outlook does not, so the rules are per-provider; stripping dots everywhere would merge two real people. 20 checks, including the degenerate cases. Pre-existing duplicates are reported, never merged. |

### Built, not yet exercised by real traffic

| Built | Note |
|---|---|
| **Test sessions** | A preview is a real session, marked — so chat, personas and the offer behave exactly as they will, and only analytics and automated messaging skip it. Surfaced a bug worth naming: a test run satisfied the scheduler's "a session already exists" check, which would have silently stopped the real schedule from rolling forward. |
| **Chat rate limiting per session** | The chat POST had *no* limiting at all; `LIMITS.chat` existed and was never applied to it. Three ceilings now, plus a duplicate-message guard. |
| **Poll results as engagement** | Attendee bars keep moving for thirty seconds after voting; the host sees the aggregate across every session. |
| **Handout and CTA tracking** | Both tables existed with nothing recording who acted on them. |
| **Real social proof on the offer** | Computed from the purchases ledger, with a floor of three — "1 person bought" is worse than silence and, in a small room, identifies the buyer. |
| **Admin roles** | Three fixed roles behind a capability gate, so support can answer a ticket without being able to issue a refund. |
| **Saved views on the user list** | |

### Corrections to this review

- **Clone a webinar** and **per-attendee countdown** were both listed as missing. Both already existed. Noted in the tables below.
- **Preview as an attendee** was listed as missing; a simulated preview page already existed. What was actually missing was a *real* run, which is what test sessions add.
- **Graceful degradation when Realtime drops** was listed as missing; the polling fallback was already there.
- **A pre-flight check before a session** was listed as missing; the cron route already existed.

---

## What already holds up

- **Seeking is disabled** — `controls={false}` plus `controlsList="nodownload noplaybackrate noremoteplayback"`. An attendee cannot scrub ahead and discover it is a file.
- **Drift is corrected against the session clock**, with the server's own time offset measured — so a wrong clock on the attendee's machine does not desync them.
- **Chat backfills on late join.** Arriving twenty minutes in shows the conversation that "already happened" rather than an empty panel.
- **Timed comments are deduplicated server-side** with a unique constraint, so two browsers cannot double-post the same persona line.
- **Attendance is counted from dated events**, not a boolean that can drift.
- **Sessions roll forward in Postgres**, not in a Vercel cron that the Hobby plan would cap at once a day.

---

## ⚠ The one that worries me most

Not on any feature list:

> **A single MP4 at one bitrate, plus aggressive drift correction, equals a visible time-jump whenever the video buffers.**

On a train, on hotel wifi, on 4G — the player falls behind, the correction yanks it forward, and the attendee sees the speaker teleport. **Live video does not do that.** This is the most likely way someone works out it is recorded, and it happens without anyone doing anything unusual.

---

## 1. Illusion integrity — *existential* — 7 additions

The product's entire value rests on the room feeling live. These are the remaining ways it stops feeling that way.

| Addition | Why |
|---|---|
| **Adaptive bitrate instead of one MP4** | Cloudinary can serve HLS with a streaming profile. Today it is `q_auto,f_auto` on a single file — quality-adaptive, but not *bitrate*-adaptive. A weak connection buffers rather than dropping to a lower rendition, and buffering is what triggers the visible jump. |
| **Gentle catch-up rather than a hard seek** | When behind by a few seconds, play at 1.05× until caught up instead of jumping. Reserve the hard correction for gaps large enough that nothing else would work. This alone removes most of the tell. |
| **A buffering state that reads as a network hiccup** | Live streams stall too — the honest thing is a spinner that looks like a stream stalling, not a paused video. |
| **Sync across tabs and refreshes** | Worth an explicit test: refresh mid-session, open a second tab, background the tab for five minutes. Browsers throttle timers in background tabs, which is exactly when drift accumulates. |
| **Chat pacing on late join** | Backfill works, but if forty messages land at once on join, it reads as a dump rather than a conversation. Stagger the last few so the room feels like it is still moving. |
| **Signed, expiring video URLs** | The MP4 URL is currently permanent and guessable from the network tab. Anyone who finds it has the whole webinar, forever, and can share it. |
| **DST behaviour on recurring schedules** | A schedule set for 8pm daily crosses a clock change twice a year. Verify it stays at 8pm local rather than sliding an hour — the failure is silent and only visible to attendees. |

---

## 2. Reach and accessibility — *high* — 6 additions

These let more people watch at all — and one is a legal requirement in several markets this product sells into.

| Addition | Why |
|---|---|
| **Captions** | There are none, anywhere. Beyond accessibility law, most people watching on a phone in public have the sound off — a webinar with no captions is silent content to them. Cloudinary can auto-transcribe on upload. |
| **A transcript** | Falls out of captions for free, and is the raw material for every repurposing feature a host will eventually ask for — blog posts, clips, summaries, search. |
| **Keyboard and screen-reader pass on the watch room** | The chat panel, offer button and reactions are the parts most likely to be unreachable without a mouse. |
| **Bandwidth-aware quality selection** | Pairs with adaptive bitrate: let someone force a lower quality rather than buffering repeatedly. |
| **Audio-only mode** | For anyone on a poor connection. A webinar is mostly someone talking, and audio survives a bad network where video does not. |
| **Calendar invite on registration** | Still the single biggest lever on attendance, still missing. Flagged in the email roadmap and not yet built. |

---

## 3. Reliability — *high* — 6 additions

What happens when something fails during a session that a host is not watching — which is every session, by design.

| Addition | Why |
|---|---|
| **A pre-flight check before a session starts** | Fetch the video's headers an hour before. A session that goes live with a broken video URL fails in front of everyone who turned up, and nobody finds out until they complain. |
| **Video fallback and retry** | If the source 404s or stalls hard, retry before showing an error. Right now a hiccup is indistinguishable from a broken webinar. |
| **Load testing at real concurrency** | Nothing has run with more than a handful of viewers. Supabase Realtime has connection and message-rate limits, and chat is the first thing that breaks under them. |
| **Chat rate limiting per session** | Per-IP limits exist. A busy room is a different pressure: a thousand people typing is legitimate traffic that still needs shaping. |
| **Graceful degradation when Realtime drops** | Fall back to polling rather than a chat that silently stops updating — a dead chat during a "live" event is worse than a slow one. |
| **Overlap protection on schedules** | Two sessions of the same webinar running at once would split the room and the analytics. |

---

## 4. Conversion — *most upside* — 8 additions

The engine's job is to sell. This area has the most upside and the least built — one offer, one moment, no experimentation.

| Addition | Why |
|---|---|
| **Checkout inside the room** | The offer links out today, which loses people at the exact moment they decided. Stripe Checkout in a modal keeps them in the webinar and closes the loop the platform already tracks. |
| **Split testing** | Two offer variants, two reveal times, two registration pages. There is no way to learn what works, and this product is bought by people who optimise for a living. |
| **Order bumps and a one-click upsell** | The single highest-return addition in any checkout, and the audience for this product expects it. |
| ~~Per-attendee countdown~~ | **Correction: already per-attendee.** `OfferButton` starts the countdown from the moment that viewer sees the reveal, not from session start. A second claim I made without opening the component. |
| **Exit intent** | Catch the close, not the leave. One prompt with the replay or the offer recovers people who were otherwise gone. |
| **Real social proof on the offer** | "14 people bought in this session" is true, computable from the purchases ledger, and more persuasive than anything invented. |
| **Handout download tracking** | `timed_handouts` exists and nothing records who took one. A download is a strong buying signal going unused. |
| **Poll results as engagement, not just data** | Showing the room's answers back to it is what makes a poll feel live rather than like a form. |

---

## 5. Host confidence — *high* — 6 additions

A host cannot currently see what they built before real people do.

| Addition | Why |
|---|---|
| **Preview as an attendee** | There is no way to watch your own webinar as an attendee sees it — chat, personas, timed comments, the offer appearing. Every host will want this before their first session, and its absence is the most likely reason a first webinar goes out wrong. |
| **Test sessions** | Run one that does not count: no automation fires, nothing lands in analytics. |
| ~~Clone a webinar~~ | **Correction: this already exists.** The button is in `WebinarCard.tsx` and wired to the clone route. I asserted it was missing without checking the component. |
| **Templates for a new webinar** | A starting point beats an empty form, and it teaches the product's shape while they build. |
| **Timed-comment generation from the video** | With a transcript, propose comments at sensible moments. Writing thirty by hand is the dullest part of setup and the one most likely to be skipped. |
| **Bulk registrant import** | A host with an existing list currently has no way to bring it in. |

---

## 6. The exposure nobody has named — *worth advice* — 4 additions

Raised because it is a business risk rather than a feature gap, and because it gets more expensive to address the more customers you have.

| Addition | Why |
|---|---|
| **Get an opinion on disclosure requirements** | Consumer protection regulators in the US, UK and EU take a dim view of material misrepresentation in a sales context. Whether "live" on a webinar that is recorded counts is a question for a lawyer, not for me — but it is the kind of question that is far cheaper answered now than after a complaint. Your own Terms already prohibit hosts from making false claims; the format itself is the part nobody has assessed. |
| **A disclosure setting hosts can choose** | Some hosts sell into regulated niches and will need one. "Encore presentation" and similar framings are how the industry handles this, and offering it costs you nothing. |
| **Jurisdiction-aware defaults** | If it turns out disclosure is required somewhere you sell, the geo data to act on it is already captured. |
| **Persona content guidance** | A fake persona posting "I made $10k with this" is a fabricated testimonial, which is a different and clearer legal problem than the format itself. Worth a warning in the editor. |

---

## 7. Data quality — *medium* — 4 additions

| Addition | Why |
|---|---|
| **Watch time that stops when they leave** | Worth verifying that a backgrounded tab or a closed laptop stops accruing watch seconds. If it does not, every retention curve is optimistic. |
| **Duplicate registration handling** | The same person registering twice should be one person, not two attendees and two reminder sequences. |
| **Bot and disposable-email filtering** | Registration is a public form. Junk registrants inflate every metric a host judges themselves by. |
| **Reconcile the attended flag with the event log** | These already disagreed once, on the only test registrant. Analytics trusts the log; other code paths trust the flag. |

---

## What I'd build first

Ordered by what it costs you not to have. The first two are small and protect the thing everything else depends on.

1. **Gentle catch-up, then adaptive bitrate.** Playing at 1.05× to close a gap is an afternoon's work and removes the most common tell immediately. HLS is the deeper fix and stops the buffering that causes the gap in the first place.

2. **Preview as an attendee.** Every host wants it before their first session, and its absence is the likeliest reason a first webinar goes out wrong. Mostly a matter of rendering the watch room against a simulated clock.

3. **Captions and a transcript.** Accessibility, muted mobile viewing, and the raw material for timed-comment generation and every repurposing feature later. One upload setting starts it.

4. **Pre-flight check on scheduled sessions.** Verify the video responds before a session goes live, and tell the host rather than the audience. Cheap, and it prevents the worst possible failure.

5. **Checkout inside the room.** The largest single conversion gain available. Stripe is already wired for billing; pointing it at the host's offer keeps the buyer in the webinar at the moment they decided.

6. **Load testing.** Before a customer finds the ceiling for you. Realtime limits and chat throughput are the two most likely to bite, and both are cheap to measure now and expensive to discover live.

---

## How this was verified

Checked against the codebase rather than assumed:

- `controls={false}` and `controlsList="nodownload noplaybackrate noremoteplayback"` in `components/webinar/VideoPlayer.tsx`
- Drift correction against a measured server clock offset in `hooks/useVideoProgress.ts`
- Chat history fetched and merged on join in `hooks/useRealtimeChat.ts`
- Video served as a single `q_auto,f_auto` MP4 in `lib/cloudinary.ts`, with no streaming profile
- No caption, subtitle, VTT or transcript reference anywhere in the codebase
- No attendee-preview path in the admin panel
