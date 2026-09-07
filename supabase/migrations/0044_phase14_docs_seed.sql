-- Phase 14: seed documentation content.
-- Run after 0043_phase14_foundation.sql.
--
-- Covers a representative page in each top-level category rather than every
-- page in the Phase 14 spec's outline — the rest can be added the same way,
-- one insert per page, once written. `on conflict (slug) do nothing` makes
-- this file safe to re-run without clobbering anything a host has since
-- edited through the docs CMS.

insert into documentation_pages (slug, title, category, subcategory, position, content) values
('what-is-loopinglive', 'What is Loopinglive', 'Getting Started', null, 1, $doc$
# What is Loopinglive

Loopinglive turns a single recorded presentation into a webinar that runs on
a schedule, feels live, and follows up automatically.

You record once. From there, Loopinglive:

- Plays your video on a schedule you set, so attendees always join a session
  that is "about to start" rather than watching an on-demand video.
- Runs fake personas in the chat that comment and reply as if they were
  watching alongside your real attendees, so a first session doesn't feel empty.
- Lets a real host jump in and answer questions live, taking over from a persona
  at any point.
- Sends the reminder, follow-up, and re-engagement emails (and SMS, and
  WhatsApp) your funnel needs, without you writing a single automation by hand.
- Tracks who joined, how long they watched, whether they clicked your offer,
  and whether they bought — all in one dashboard.

> Loopinglive is not a video conferencing tool. If you want to talk to people
> in real time with your camera on, Phase 10's live mode gives you WebRTC video
> for that — but the platform's core is the "fake-live" evergreen webinar.

## Who it's for

Anyone selling through a webinar funnel — course creators, coaches,
consultants, SaaS founders running product demos — who wants the effect of a
live launch without being on camera at 9am and 9pm every day to hit every
timezone.

## Next steps

- [Quick Start Guide](/docs/getting-started/quick-start-guide)
- [Your First Webinar in 15 Minutes](/docs/getting-started/your-first-webinar-in-15-minutes)
$doc$),

('quick-start-guide', 'Quick Start Guide', 'Getting Started', null, 2, $doc$
# Quick Start Guide

The shortest path from signing up to a live registration link.

1. **Create a webinar.** From your dashboard, click *Create webinar* and give
   it a title and description. It starts as a draft — nobody can register yet.
2. **Upload your video.** In the webinar's setup panel, upload the recording
   you want attendees to watch. This becomes the video every session plays.
3. **Add personas.** Create two or three fake personas with a name and a short
   personality brief. They generate chat comments and replies while your video
   plays, using your webinar's own topic and offer as context.
4. **Set your schedule.** Choose how often sessions run — daily at fixed times,
   or "starts in the next hour," whichever matches how you promote it.
5. **Build your registration page.** Set the headline, subheading, and what
   attendees will learn. This is the page you'll link to from ads or email.
6. **Publish.** Flip the webinar from draft to published. Your registration
   link is now live.

> Test it yourself first. Every webinar has a *test session* option in its
> setup panel that runs the whole experience — waiting room, chat, offer — as
> if you were an attendee, without touching your real analytics.

## What happens after someone registers

They land in a waiting room until the session starts, then watch your video
with the chat running alongside it. If you've set up an offer, it appears at
the timestamp you configured. Automation (email/SMS/WhatsApp reminders,
follow-ups, replay access) fires from there without anything more from you.
$doc$),

('your-first-webinar-in-15-minutes', 'Your First Webinar in 15 Minutes', 'Getting Started', null, 3, $doc$
# Your First Webinar in 15 Minutes

A faster, more opinionated version of the [Quick Start Guide](/docs/getting-started/quick-start-guide) — the minimum to get a real session running today.

1. Upload a video you already have, even a rough one. You can replace it later
   — nothing about your registration page or schedule depends on the file itself.
2. Add exactly two personas. One who asks the questions your real audience
   asks, one who reacts positively when your offer appears. That's enough for
   a chat that feels populated without feeling scripted.
3. Set one schedule: "starts every day at a time close to now." This gets you
   a session to test within the hour instead of waiting for tomorrow.
4. Skip the registration page customisation for now — the defaults are
   deliberately fine to launch with. You can redesign it once you've watched a
   real session end to end.
5. Publish, register with your own email, and sit through the whole thing once
   as an attendee would. This is the fastest way to catch anything that reads
   wrong before a real prospect does.

Once that first run feels right, go back and build out personas, timed
comments, and the offer properly — see [Creating Fake Personas](/docs/setting-up-your-webinar/creating-fake-personas)
and [Timed Comments](/docs/setting-up-your-webinar/timed-comments).
$doc$),

('uploading-your-video', 'Uploading Your Video', 'Setting Up Your Webinar', null, 1, $doc$
# Uploading Your Video

Your webinar's video is the one asset every session plays from.

## Requirements

- Standard video formats (MP4 is the safest choice) upload without issue.
- There is no strict length limit, but a webinar between 30 and 75 minutes
  converts best — long enough to build a case for your offer, short enough
  that attendees stay for the reveal.
- Upload happens once per webinar. Replacing the video later updates every
  future session; sessions already in progress are unaffected.

## What happens after upload

Loopinglive stores your video and reads back its duration automatically —
this duration is what your schedule, timed comments, and offer timestamps are
all measured against, so upload the *final* cut before you start timing
comments or placing your offer button.

## Replacing a video

If you re-upload, every timestamp you've already set (comments, offer
reveal, chapters) stays in seconds from the start — so a materially different
edit (cuts, added intro) can throw those off. For a small trim, this is
usually fine; for a significant re-edit, double-check your timed content
after replacing.
$doc$),

('creating-fake-personas', 'Creating Fake Personas', 'Setting Up Your Webinar', null, 2, $doc$
# Creating Fake Personas

Personas are what make the chat feel populated on session one, before you
have any real audience history.

## Setting one up

Each persona has:

- **A name and avatar** — what attendees see next to their messages.
- **A personality brief** — a short description of who they are and how they
  talk. This is what the AI reading your webinar's content uses to generate
  in-character comments and replies.
- **Reply behaviour** — whether this persona replies to real attendees'
  messages, and how often it jumps into an unprompted comment versus staying quiet.

## Writing a good personality brief

Specific beats generic. "Enthusiastic, asks practical how-do-I-start
questions, uses exclamation points" produces more believable chat than
"friendly viewer." Give each persona a distinct voice — a chat where every
persona sounds the same reads as fake faster than one with none at all.

## How many to add

Two or three is usually enough for a session with a modest expected
attendance. Add more as your real, organic chat activity grows — the goal is
personas that supplement a real conversation, not personas that *are* the
conversation once you have a genuine audience.

## Testing before you go live

Use *Test Session* in the webinar's setup panel to watch your personas react
to your own video and offer before a real attendee does. If a reply reads
oddly, it's the personality brief to adjust, not the underlying engine.
$doc$),

('timed-comments', 'Timed Comments', 'Setting Up Your Webinar', null, 3, $doc$
# Timed Comments

Timed comments are chat messages scripted to appear at an exact point in your
video, every session, from a persona you choose.

## Why script comments instead of relying on AI replies alone

AI-generated persona replies react to what's happening, but a scripted
comment lets you land a specific line exactly when it matters — right as you
reveal a result, right before the offer, right when a common objection would
occur to someone watching.

## Adding one

In the comment editor, scrub to the moment in your video you want the
comment to appear, choose which persona says it, and write the line. It fires
at that timestamp on every session from then on.

## Where to place them

- Early (first 2–3 minutes): a comment that signals "other people are here
  too" — this is where a quiet chat feels most obviously fake.
- Around your key proof point: a reaction that reinforces what you just said,
  in the attendee's own words rather than yours.
- Just before the offer: a question a real buyer would ask, so the offer
  doesn't appear to an empty room.

## Working alongside AI replies

Scripted comments and AI-generated replies run side by side — a scripted
comment fires at its timestamp regardless of what else is happening in chat,
while AI replies keep responding to whatever real attendees say in between.
$doc$),

('ai-personas', 'AI Personas', 'Engagement Features', null, 1, $doc$
# AI Personas

Beyond scripted [timed comments](/docs/setting-up-your-webinar/timed-comments),
your personas generate their own replies in real time using your webinar's
topic, talking points, and offer as context.

## How a reply gets generated

When a real attendee sends a chat message, an active persona may reply,
using your webinar's context plus the persona's own personality brief to
write something in character. How often a given persona jumps in is
controlled by its reply percentage — not every persona replies to every
message, which keeps the chat from feeling like it's addressing one person at once.

## AI mode vs. human mode

Each persona can be toggled between AI mode (replies generate automatically)
and human mode (you write the reply yourself, live, from the admin panel).
Switching a persona to human mode mid-session is useful when a question needs
a real, specific answer only you can give — the persona's earlier AI replies
and your manual one are indistinguishable to attendees.

## Keeping replies on-brand

If a persona is replying oddly, the fix is almost always the personality
brief — the model default to disagreeable/curt/overly formal tone.
$doc$),

('email-templates', 'Email Templates', 'Follow-Up Automation', null, 1, $doc$
# Email Templates

Every automated message Loopinglive sends — registration confirmation, "you're
starting soon," "you missed it, here's the replay," post-webinar follow-up —
comes from a template you can customise per webinar.

## What's in a template

A subject line and body, with variables like the attendee's name, the
webinar's title, and the session time filled in automatically when the
message sends. You can edit any template's copy without touching the
schedule it fires on.

## When each message sends

Templates are tied to specific moments in the automation sequence:
registration, a reminder before the session starts, a "starting now" nudge,
a no-show follow-up with replay access, and a post-webinar sequence for
attendees who watched but didn't buy. Each one can be turned on or off
independently in your webinar's automation settings.

## Testing a template

Send yourself a test copy of any template before relying on it — this sends
to your own signed-in account's email, so you see exactly what an attendee
would receive without touching real send counts.
$doc$),

('understanding-your-dashboard', 'Understanding Your Dashboard', 'Analytics', null, 1, $doc$
# Understanding Your Dashboard

Your webinar's analytics page is where registration turns into a story about
what worked.

## The numbers that matter most

- **Registrants vs. attendees** — how many people signed up versus actually
  showed up. A large gap usually means your reminder sequence, not your
  registration page, needs attention.
- **Watch depth** — how far through the video attendees typically get. A drop
  at a specific point is a script problem at that exact moment, not a vague
  "engagement issue."
- **Offer clicks vs. purchases** — clicking your offer and buying are
  different funnels; a webinar with high clicks and low purchases points at
  your checkout or price, not your presentation.

## Segmenting attendees

Beyond the headline numbers, you can filter attendees by whether they
attended, watched to a given point, clicked the offer, or bought — useful for
building a follow-up list of "watched most of it but didn't buy" rather than
messaging everyone the same way.

## Comparing sessions

Because Loopinglive runs the same recording across many scheduled sessions,
you can compare attendance and conversion across sessions run at different
times to find which schedule actually converts best for your audience.
$doc$),

('zapier', 'Zapier', 'Integrations', null, 1, $doc$
# Zapier

Connect Loopinglive to the rest of your stack without writing code, using
webhooks as the bridge to Zapier.

## Setting it up

1. In Zapier, create a new Zap with a **Webhooks by Zapier** trigger, set to
   "Catch Hook." Zapier gives you a unique URL.
2. In Loopinglive, go to *Settings → Webhooks* and add that URL as an
   endpoint.
3. Choose which events should trigger it — registration, attendance,
   purchase, and more are all available individually, or leave every box
   unticked to receive everything.
4. Send a test event from the webhook's *Test* button and confirm it arrives
   in Zapier, then build the rest of your Zap from that sample payload.

## What you can build

Add a new registrant straight to your CRM, post a Slack message when someone
buys, add a row to a Google Sheet for every attendee, or trigger an SMS
through a different provider — anything Zapier can receive a webhook and act
on.

## Verifying requests are really from Loopinglive

Every webhook request is signed. Compute an HMAC-SHA256 of the raw request
body using the endpoint's signing secret (shown in *Settings → Webhooks*) and
compare it to the `X-Loopinglive-Signature` header before trusting a payload.
$doc$),

('authentication', 'Authentication', 'API Reference', null, 1, $doc$
# Authentication

Loopinglive's API is authenticated with an API key tied to your account.

## Creating a key

Go to *Settings → API keys* and create a new key. The full key is shown once,
at creation — Loopinglive stores only a hash of it, so if you lose it you'll
need to create a new one rather than retrieve the old one.

## Using a key

Send it as a bearer token on every request:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Scope

A key can only reach webinars and data owned by the account (or team) it was
created under — the same ownership rules that apply in the dashboard apply to
the API, so a key cannot be used to reach another account's webinars.

## Revoking a key

Delete it from *Settings → API keys* at any time. Revocation is immediate —
any request already using that key fails on its next call.
$doc$),

('team-accounts', 'Team Accounts', 'Team and Enterprise', null, 1, $doc$
# Team Accounts

A team lets more than one person manage the same set of webinars under one
billing account.

## Roles

- **Owner** — the account that created the team; full control, including
  billing.
- **Admin** — can manage webinars, members, and settings, but not billing.
- **Editor** — can create and edit webinars but not manage the team itself.
- **Viewer** — read-only access to webinars and analytics.

## Inviting someone

From *Team → Members*, invite by email and choose their role. They receive an
invitation link that expires after a set window; accepting it joins them to
the team at the role you chose.

## Ownership of webinars created by a team member

A webinar created under a team is owned by the team, not the individual who
created it — so it stays reachable by the team if that person's role changes
or they leave.

## Leaving or removing someone

An admin can remove a member at any time; a member leaves their current team
before joining a different one, since an account belongs to at most one team.
$doc$),

('plans-and-pricing', 'Plans and Pricing', 'Billing', null, 1, $doc$
# Plans and Pricing

Loopinglive's plans differ in what you can do, not in a separate, harder
version of the product.

## What changes between plans

Higher plans raise limits (webinars, attendees, team seats) and unlock
features like white-label registration pages, AI persona generation, and full
analytics. See the current plans and their limits on the
[pricing page](/pricing).

## Upgrading or downgrading

Change your plan any time from *Settings → Billing*. An upgrade takes effect
immediately; a downgrade takes effect at the end of your current billing
period, so you keep what you've paid for until then.

## What happens if a webinar exceeds a lower plan's limits

Existing webinars and data are never deleted for being over a new, lower
plan's limit — you simply can't create additional webinars past the limit
until you're back under it or upgrade again.

## Cancelling

Cancel from *Settings → Billing*. Your plan stays active until the end of the
period you've already paid for.
$doc$),

('video-not-loading', 'Video Not Loading', 'Troubleshooting', null, 1, $doc$
# Video Not Loading

## Check the upload finished

A large file can take a few minutes to finish processing after upload. The
setup panel shows a clear "processing" state until it's ready — if a webinar
is still in that state, wait rather than re-uploading.

## Check the webinar is published

A draft webinar's registration and watch pages are not reachable the same way
a published one is. Confirm the webinar has been published if you're testing
via a real registration link rather than *Test Session*.

## Attendee-side causes

Most playback issues that reach us are the attendee's connection or browser,
not the video itself:

- Ask them to try a different browser — Safari and in-app browsers (from
  social apps) are the most common source of playback quirks.
- A corporate or school network firewall can block video delivery outright.
- Ad blockers occasionally interfere with the video player; ask them to try
  with it disabled for your registration domain.

## If it's genuinely broken

If a video that played fine before suddenly doesn't for anyone, re-upload it
— video hosting failures are rare but a fresh upload resolves them when they do occur.
$doc$),

('payment-issues', 'Payment Issues', 'Troubleshooting', null, 2, $doc$
# Payment Issues

## An attendee's card was declined on your offer

This happens at your checkout, which is processed by Stripe — Loopinglive
records the click and the outcome but doesn't control the decline itself.
Ask the attendee to check with their bank or try a different card; this is
rarely something to fix on the webinar side.

## Your own subscription payment failed

Stripe retries a failed subscription payment automatically over several days.
Update your card in *Settings → Billing* to have the next retry succeed
immediately rather than waiting out the full retry window.

## A refund isn't reflecting

Refunds issued through Stripe can take a few business days to appear on the
customer's statement even after Stripe confirms the refund succeeded — this
is normal bank processing time, not a Loopinglive delay.

## Still stuck

Email support@loopinglive.com with the webinar, the approximate time, and
what happened — for billing issues on your own account, include the last four
digits of the card so we can find the right Stripe record quickly.
$doc$)

on conflict (slug) do nothing;
