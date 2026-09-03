# Webinar Engine Hardening — Review

**Where the illusion breaks.**

I went looking for the obvious holes and mostly did not find them — the engine is better defended than I expected. This document has been updated across a long implementation pass; most of what it originally flagged is now built and, where it was practical to prove, verified against the production database rather than assumed.

| | |
|---|---|
| **~45** built and verified this pass | Across illusion integrity, reliability, conversion, trust and safety, and platform operations |
| **9** corrections | Items this review claimed were missing that already existed — several from before this pass began |
| **A handful** genuinely outstanding | Listed at the bottom, honestly — mostly things that need credentials or accounts only the user can provide |

---

## The largest single win, found by accident

Load testing was meant to measure concurrency. It found a region mismatch instead.

`X-Vercel-Id` read `lhr1::iad1` — requests entered in London and the function executed in **Washington DC**, while Supabase runs in **eu-central-1**. Every database query on every page crossed the Atlantic twice. One line in `vercel.json` pins the functions to `fra1`, beside the database.

Measured on production, before and after, with the same 40-viewer test:

| | before | after |
|---|---|---|
| `/api/health` query | 156–344ms | 46–63ms |
| chat p50 | 276ms | **103ms** |
| chat p95 | 1191ms | **259ms** |
| viewer count p95 | 1235ms | **192ms** |
| session p95 | 1044ms | 603ms |

Chat p95 at forty viewers had been close to the point where one viewer in twenty sees the room stall. It is now comfortable, and the gain applies to every query on every page rather than to one endpoint.

`scripts/loadtest.mjs` is how this was measured. It polls what a real viewer's browser polls, at the intervals it uses, and writes nothing — run it against production and it costs reads, not rows.

---

## Verified against the production database

Each of these was tested in a rolled-back transaction or against a real query before being trusted, not just typechecked.

| Built | How it was verified |
|---|---|
| **Recurring schedules keep local time** | `timezone` had been stored since migration 0001 and never read, so 20:00 ran at 16:00 in New York — wrong by a whole offset for every host outside UTC, permanently, on top of the DST slide. Fixed in the SQL, its TypeScript mirror and the form. **1,500 of 1,500 combinations agree with the database** across ten zones, both hemispheres' boundaries, the hour that never happens and the hour that happens twice. |
| **Attendance reconciled with the event log** | The cause was a read-then-write race on the join transition; it is a compare-and-set now. `attendance_mismatches()` found the exact row this review flagged, `reconcile_attendance()` wrote its missing event, count now zero. |
| **Overlap protection on schedules** | Exclusion constraint, not an application check. Tested in a rolled-back transaction: overlap rejected, test run exempt, back-to-back accepted. |
| **Email hygiene and duplicate registration** | Gmail ignores dots and Outlook does not, so the rules are per-provider. 20 checks. Pre-existing duplicates reported, never merged. |
| **Order bumps** | `purchases` is unique on `(registrant_id, offer_id)`; a second row for the bump would collide with it, so the bump rides the same purchase row instead. Verified the upsert and the constraint against real data. |
| **Fraud signals (chargebacks)** | First version filtered `status = 'open'`, which Stripe never actually writes — testing against a real account caught `open_disputes: 0` before it shipped. Fixed to use `resolved_at`. |
| **IP allowlist for the console** | The server refuses to enable it unless the requester's own address is covered — verified disabled/empty/covered/uncovered/malformed against a rolled-back transaction. |
| **Two-factor for admins** | Hand-written TOTP, verified against all six RFC 6238 test vectors plus window boundaries. One bug caught: `generateRecoveryCodes` used `Array.from({ count })`, which has no `length`, and would have silently issued zero codes. |
| **WebVTT transcript parsing** | 19 checks: cue identifiers, cue settings, an hour boundary, CRLF, multi-line cues. |

---

## Built, not yet exercised by real traffic

| Built | Note |
|---|---|
| **Test sessions** | A preview is a real session, marked — chat, personas and the offer behave exactly as they will; only analytics and automated messaging skip it. Caught a real bug: a test run satisfied the scheduler's "a session already exists" check and would have silently stopped the real schedule. |
| **Chat rate limiting per session** | The chat POST had *no* limiting at all. Three ceilings now, plus a duplicate-message guard. |
| **Poll results as engagement** | Attendee bars keep moving for 30s after voting; the host sees the aggregate across every session. |
| **Handout and CTA tracking** | `handout_downloads` already existed from an earlier migration with nothing calling it — wired up rather than duplicated. |
| **Real social proof on the offer** | Computed from the purchases ledger, floor of three. |
| **Admin roles + 2FA + IP allowlist** | Three fixed roles behind a capability gate; TOTP enforced on the console; an optional allowlist that cannot be turned on until it covers whoever enables it. |
| **Video fallback and retry** | HLS and the progressive MP4 both retry with backoff; the MP4 path had none at all before. |
| **Bandwidth-aware quality selection** | A viewer can pin the stream to its lowest rendition without a reload, which would restart playback against the session clock. |
| **Disclosure setting + jurisdiction nudge** | `broadcast_label` and `show_recorded_notice` existed on the schema since Phase 10 with nothing reading or writing them. Now wired end to end, plus a geo-based nudge using data already captured on every registrant. |
| **Persona claim-check** | Flags earnings claims, first-person testimonials, guarantees, health claims and invented urgency as a host types a timed comment — and again on anything the transcript generator proposes. |
| **Timed-comment generation from transcript** | Reads Cloudinary's auto-transcript, proposes a scattering of persona reactions, every one passed through the claim check before a host sees it. Not exercised end to end — `ANTHROPIC_API_KEY` is a placeholder on this deployment. |
| **GDPR export and erasure** | 14 tables carry a registrant_id; done in Postgres rather than the application so a schema change cannot silently leave one behind. A sale stays, unlinked; a suppression stays, hashed. |
| **Maintenance mode** | Env var wins over the database flag — the database is exactly what might be down. |
| **Trust & safety: reports + review queue** | A quiet report control in the chat, open to people who never registered. |
| **Bulk actions on the user list** | Capped at 200; re-checks the per-action role server-side rather than trusting the button that offered it. |

---

## Corrections to this review

Nine claims across the life of this review turned out to be wrong — either things that already existed before this pass, or things fixed and then re-checked. Recorded here rather than quietly dropped.

- **Clone a webinar** and **per-attendee countdown** were listed as missing. Both already existed.
- **Preview as an attendee** was listed as missing; a simulated preview page already existed. What was missing was a *real* run, which test sessions now add.
- **Graceful degradation when Realtime drops** was listed as missing; the polling fallback already existed.
- **A pre-flight check before a session** was listed as missing; the cron route already existed.
- **Checkout inside the room** was listed as missing under Conversion. It already existed — `OfferButton` opens Stripe Checkout in a new tab rather than linking out, and the room keeps playing behind it.
- **Exit intent** was listed as missing. `useExitIntent` + `ExitPrompt` already existed and were already wired into `WatchRoom`.
- **Split testing** was listed as missing. `lib/experiments.ts` already assigned and stored offer variants per registrant.
- **Captions, a transcript, and audio-only mode** were listed as missing under Reach and accessibility. All three already existed — captions and transcript through Cloudinary's auto-transcription, audio-only as a toggle in `VideoPlayer`.
- **Calendar invite on registration** was listed as missing. `lib/calendar.ts` and the `/calendar` route already existed and were already wired.

---

## What already holds up

- **Seeking is disabled** — `controls={false}` plus `controlsList="nodownload noplaybackrate noremoteplayback"`. An attendee cannot scrub ahead and discover it is a file.
- **Drift is corrected against the session clock**, with the server's own time offset measured — so a wrong clock on the attendee's machine does not desync them.
- **Chat backfills on late join**, with the most recent messages staggered rather than dumped, so the room reads as still moving rather than as a wall of text arriving at once.
- **Timed comments are deduplicated server-side** with a unique constraint, so two browsers cannot double-post the same persona line.
- **Attendance is counted from dated events**, not a boolean that can drift — and the two are now kept in agreement by a compare-and-set on the join transition.
- **Sessions roll forward in Postgres**, not in a Vercel cron that the Hobby plan would cap at once a day.
- **Video fallback and retry**, HLS and progressive, both with growing backoff and a give-up state that offers a reconnect rather than a spinner turning forever.
- **The account layer**: roles, 2FA, an optional IP allowlist, and a maintenance mode that survives the database being the thing that's down.

---

## Genuinely outstanding

Honestly: what is left needs either credentials only the user can provide, or a scope large enough that it deserves its own pass rather than being squeezed in here.

| Item | Why it's not done |
|---|---|
| **Stripe, LiveKit, a real `ANTHROPIC_API_KEY`** | Configuration only the user can supply. Billing, live broadcast, and AI-generated content are all built against these and untested without them. |
| **Sentry / external error monitoring** | Needs an account and a DSN. The platform's own client-error log (`/superadmin/errors`) exists and works without one. |
| **Calendly OAuth** | Needs API credentials from a Calendly developer account. |
| **A full mobile device audit and PageSpeed pass** | The accessibility and region-latency work in this pass improves both; neither has been measured on a real device or through Lighthouse, which needs a live audit rather than a code read. |
| **Credential rotation** | Several credentials were pasted into chat over the course of this project (Resend, the Supabase service role, the database password, Cloudinary). Repeatedly flagged; still the user's to act on. |

---

## How this was verified

Where a claim above says "verified," it was checked one of these ways, not assumed:

- **Against the live production database**, usually in a transaction rolled back afterward — the fraud-signals bug, the 2FA recovery-code bug, and the allowlist behaviour were all caught this way.
- **With standalone test scripts** run against the actual library code (stripped of Next.js-only imports where needed) — the timezone math, the TOTP implementation, the VTT parser, and the email-hygiene rules were all checked against known-correct references (RFC 6238 vectors, hand-computed offsets) rather than only against themselves.
- **By reading the code directly** before claiming something was missing or present — the corrections section above exists because that step was skipped at least nine times across this review's life, and every one of those mistakes was more work to unwind than the five minutes it would have taken to open the file first.
