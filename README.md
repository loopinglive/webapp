# Loopinglive — Complete Platform Feature Specification
> Version 1.0 | Pre-Recorded Webinar Platform (Live Webinar Coming Soon)

---

## 🎯 What Is Loopinglive?

Loopinglive is a premium SaaS webinar platform that lets coaches, course creators, and info product sellers host automated "fake-live" webinars that convert like real live events. Hosts upload a pre-recorded video, schedule it to run at specific times, and the platform simulates a fully live experience — complete with a waiting room, buzzing chat, AI personas, real-time offer buttons, and a complete follow-up automation engine.

---

## 🎬 CORE WEBINAR ENGINE

### Pre-Recorded Video
- Upload pre-recorded video hosted on Cloudinary
- Video plays as if it is happening live in real time
- Speaker talks as if live — welcoming audience, calling names, asking questions
- Host can swap the video anytime (monthly refresh strategy supported)
- Video duration is tracked to the exact second for timed event triggers

### Scheduled Sessions
- Host sets specific days and times for webinar to run (e.g. daily at 8PM, Mon/Wed/Fri at 12PM)
- Multiple time slots per webinar supported
- Recurring schedules: daily, weekly, specific days of the week
- Timezone auto-detection — attendees see the webinar time in their local timezone
- Webinar series support — sequence of webinars (Webinar 1 → 2 → 3)

### Waiting Room
- Attendees with the link arrive before the scheduled time and are held in a branded waiting room
- Countdown timer shows exactly how long until the webinar starts
- Waiting room shows attendee count building up (social proof)
- Custom waiting room background and branding per webinar
- At the exact scheduled time the video begins playing automatically

---

## 💬 CHAT SYSTEM

### Fake Persona System (Simulated Social Proof)
- Admin creates unlimited fake personas with names and avatars per webinar
- Each persona can have a comment history with unlimited timed comments
- Admin assigns each comment a video offset timestamp (e.g. drop at 00:05:11 into the video)
- At that exact moment in the video the comment appears in the chat using real-world clock time (e.g. 20:05:11)
- Admin can edit any persona's comment: change the comment text or the video timestamp at any time
- Personas simulate a busy, engaged audience throughout the entire webinar
- Speaker in the video calls out fake persona names and locations as if welcoming them live
- Speaker intentionally misses some names so real viewers feel they are not the only ones missed

### Real User Chat
- Real attendees can type and send messages at any time during the webinar
- Real user comments appear in the chat ordered by the real-world timestamp they were sent
- Real and fake comments interleave naturally based on time hierarchy
- Real users can see all messages — both from real users and fake personas — in one unified chat
- Real users cannot distinguish fake comments from real ones

### AI Persona Reply System
- Two AI personas with distinct human names (e.g. Sarah and James)
- Each persona has a custom personality brief set by the host (e.g. "Sarah — warm, encouraging, uses emojis" / "James — direct, knowledgeable, no fluff")
- AI replies to 100% of real user comments — no real attendee is ever ignored
- AI replies to a configurable percentage of fake persona comments (e.g. 40–60%) to keep chat alive without looking robotic
- AI is given full context: webinar topic, offer details, video timestamp, and which stage of the video is currently playing
- AI knows not to reveal it is an AI — always responds naturally as a human moderator
- Replies are threaded and directed — "↩ replying to @UserName"
- AI can recognise questions, objections, reactions, and statements and respond appropriately
- Reply frequency is configurable per host

### Admin Live Override
- Admin can access a live session panel during any running webinar
- Admin sees the full chat in real time including all real and fake messages
- Real user messages are highlighted and filterable so admin can spot leads instantly
- Admin can filter by: all messages / real users only / unanswered real users only / specific user
- Each message has a Reply button visible only to the admin
- Admin clicks Reply on any specific comment to open a threaded reply box directed at that exact user
- Admin can toggle any AI persona from AI mode to Human mode with one click
- In Human mode admin types replies manually under that persona's name and avatar
- Admin can switch back to AI mode at any time mid-session
- Both personas can be in AI mode, both in human mode, or one each — fully flexible
- Real attendees never know whether they are talking to AI or a human

---

## 🎥 WEBINAR ROOM UI

### Desktop Layout
- Landscape video player on the left (speaker + presentation in one video)
- Live chat panel on the right side
- World-class UI — nothing like anything currently on the market
- Offer button pinned and visible at all times once triggered
- Viewer count displayed (shows social proof of how many people are watching)
- Clean, distraction-free, premium design

### Mobile Layout
- Full screen video player
- Chat toggled open/closed via a floating chat icon
- Offer button appears as a sticky bar pinned to the bottom of the screen
- Chat icon and offer button coexist cleanly at the bottom of the screen
- Swipe or tap interactions optimised for mobile

### Timed Engagement Triggers (drop at exact video timestamps)
- Timed polls — drop a poll question at a specific moment (e.g. "Which of these applies to you?")
- Timed handouts — drop a downloadable PDF or resource at a specific moment
- Timed CTAs — a call-to-action button appears at a specific moment
- Timed offer button — the main offer button animates in at the exact moment the host reveals the offer in the video
- Timed pinned chat message — admin can schedule a chat message to pin at a specific moment (e.g. "🔥 The offer James just mentioned is now live!")
- All timed triggers are set in the admin using video offset time (not real-world time)

### Emoji Reactions
- Viewers can send emoji reactions (👏 🔥 ❤️ 💯) that float up the screen
- Adds energy and social proof to the room

### Q&A Mode
- Dedicated Q&A tab separate from the main chat
- Real users can submit questions
- Admin or AI can mark questions as answered
- Host can feature specific questions

---

## 🛒 OFFER SYSTEM

### Offer Button
- Prominent animated offer button that appears on screen at the exact video timestamp set by the host
- On desktop: pinned below the video or at the bottom of the chat panel
- On mobile: sticky bar pinned to the bottom of the screen
- Button animates in — slides up, pulses, glows — impossible to miss
- Button stays visible for the rest of the webinar once triggered
- Fully customisable: button text, button colour, button style

### Offer Options
- Internal offer: host builds a sales page inside Loopinglive
- External offer: host links to an external sales page URL
- Offer opens in a modal/popup inside the webinar room OR in a new tab (host's choice)
- Multiple offers per webinar supported
- Countdown timer on the offer button (e.g. "Offer expires in 14:32") — FOMO built in
- One-click upsell after purchase
- Order bumps on checkout
- Payment plans — buyers can pay in instalments
- Coupon codes for the offer
- Internal checkout page builder (drag and drop sales page inside Loopinglive)

### Purchase Tracking
- If sales page is inside Loopinglive: system automatically marks attendee as "Bought"
- If sales page is external: admin can manually mark attendee as "Bought"
- Bought attendees are immediately moved to the "Buyers" segment
- Buyers are never re-marketed for the same webinar offer again
- Buyers can be upsold into a new higher-tier webinar after 1–2 months

---

## 📋 ATTENDEE REGISTRATION & ENTRY

### Registration Flow
- Attendees do not need a pre-created account to watch a webinar
- On joining they provide: Full name, Email address, Phone number, Country code (with flag selector)
- Country flag + country code dropdown for phone number entry
- GDPR consent checkbox on registration
- Custom registration page per webinar with host's branding, logo, colours, and headline
- Custom thank-you page after registration
- Embed registration form on external websites via iframe or script
- Custom domain support — webinar can run on host's own domain
- Source tracking — system records where the registrant came from (Facebook, email, etc.)
- Custom registration fields — host can add extra fields (e.g. company name, role, biggest challenge)

### Attendee Entry
- After registering attendee receives confirmation with webinar link and time
- On the day they click the link and are taken to the waiting room
- At the scheduled time the webinar begins
- Attendee entry registers their attendance in the system automatically

---

## 📊 SEGMENTATION & ANALYTICS

### Attendee Segments
- Registered — signed up but webinar has not happened yet
- Attended — joined and watched the webinar
- Did Not Attend — registered but never joined
- Watch Depth segments for those who attended:
  - Watched 0–30% of the video
  - Watched 30–50% of the video
  - Watched 50–70% of the video
  - Watched 70–90% of the video
  - Watched 90–100% of the video
- Clicked Offer — attended and clicked the offer button
- Bought — attended and purchased the offer
- Did Not Buy — attended but did not purchase

### Returning Attendees
- If a non-buyer returns and re-registers for the same webinar the system clears all previous data and treats them as new
- If a buyer returns and re-registers the system does NOT clear their history — they are admitted but receive no reminders or follow-up for this webinar
- Old buyers can be placed into an upsell sequence for a higher-tier webinar after 1–2 months

### Per-Attendee Profile
- Admin can click any attendee and see:
  - Full name, email, phone number, country
  - Registration date and time
  - Whether they attended and how long they watched
  - Watch depth percentage
  - All chat messages they sent during the webinar
  - Whether they clicked the offer link
  - Whether they purchased
  - Which webinar session they attended
  - Source of registration

### Analytics Dashboard (Per Webinar)
- Total registrations
- Total attendees
- No-show rate
- Average watch time
- Watch depth heatmap — visual graph of when viewers dropped off
- Offer click-through rate
- Conversion rate (attendees who bought)
- Revenue tracked per webinar (if using internal checkout)
- Live viewer count in real time during sessions
- Export attendee list as CSV
- Source breakdown — where registrants came from

---

## 📱 FOLLOW-UP AUTOMATION

### Communication Channels
- Email via Resend
- SMS worldwide via Twilio
- WhatsApp via Twilio WhatsApp API
- All three channels work internationally
- Phone number captured with country code and flag at registration

### Pre-Webinar Reminders (for registered attendees)
- Confirmation message immediately after registration (email + SMS + WhatsApp)
- Reminder 24 hours before the webinar
- Reminder 1 hour before the webinar
- Reminder 15 minutes before the webinar
- Reminder at the exact moment the webinar starts
- Reminder 1 hour before the webinar ends (to catch late joiners)
- System detects when a registered attendee has joined and stops sending join reminders

### Post-Webinar Follow-Up (segmented by behaviour)
- Did Not Attend → receives messages about the next available webinar session
- Attended but Did Not Buy (below 30% watch) → receives re-engagement sequence
- Attended but Did Not Buy (30–50% watch) → receives targeted sequence
- Attended but Did Not Buy (50–70% watch) → receives targeted sequence
- Attended but Did Not Buy (70–90% watch) → receives aggressive offer sequence
- Attended but Did Not Buy (90%+ watch) → receives strongest closing sequence
- Clicked Offer but Did Not Buy → receives cart abandonment sequence
- Bought → removed from all follow-up for this webinar, placed in buyer onboarding sequence

### Re-Engagement Campaign
- Non-buyers receive weekly messages about upcoming webinar sessions
- First re-engagement message sent approximately 1 month after initial attendance (by which time they have forgotten the details and feel fresh again)
- System continues until they either buy or register again
- If they register again their history is cleared (except buyers)

### Replay Access
- After webinar ends non-buyers receive a replay link via email
- Replay is available for a limited time set by the host (e.g. 24 hours, 48 hours)
- Replay page tracks watch time and reports back to analytics

---

## 🧑‍💼 HOST DASHBOARD (Webinar Creators)

### Webinar Management
- Create unlimited webinars (based on plan)
- Set webinar title, description, and topic
- Upload pre-recorded video
- Set scheduled times and recurring schedule
- Set timezone display preferences
- Enable or disable webinar sessions
- Clone existing webinars for quick setup
- Webinar series creation — link multiple webinars in a sequence

### Persona & Comment Management
- Create unlimited fake personas with name and avatar
- Per persona: add unlimited timed comments with video offset timestamps
- View full comment history per persona
- Edit comment text or timestamp at any time
- Preview how the chat will look during the webinar
- Bulk import comments via CSV

### Offer Management
- Set offer URL (internal or external)
- Set offer button text, colour, and animation style
- Set video timestamp for offer button to appear
- Add countdown timer to offer button
- Build internal sales page with drag-and-drop editor
- Set multiple offers per webinar

### Engagement Setup
- Schedule timed polls with answer options
- Schedule timed handouts (PDF uploads)
- Schedule timed CTAs
- Schedule pinned chat messages
- Configure emoji reaction settings

### Registration Page Builder
- Custom logo upload
- Custom colour scheme
- Custom headline and subheadline
- Custom registration fields
- Custom thank-you page
- Embed code generator (iframe/script)
- Custom domain connection

### AI Persona Configuration
- Set two AI persona names
- Write personality brief for each persona
- Set reply frequency for fake comment responses
- Provide webinar context (topic, offer, key talking points) for AI to use
- Test AI responses before going live

### Branding
- Custom logo per webinar room
- Custom colours per webinar room
- Custom waiting room background
- Remove Loopinglive branding (white label) — premium tier only

### Integrations
- Zapier webhook — connect to any external CRM or tool
- Direct integrations: Mailchimp, ConvertKit, ActiveCampaign, GoHighLevel
- Facebook Pixel tracking on registration pages
- Google Analytics tracking on registration pages
- Calendly integration — for booking-based offers
- API access for custom integrations

---

## 🔒 COMPLIANCE & TRUST

- GDPR consent checkbox on all registration forms
- Unsubscribe link in all email communications
- Data deletion request — attendee can request their data be deleted
- Privacy policy page on every registration page
- Terms of service acceptance on signup
- SSL encryption across all pages
- WHOIS privacy on domain registration

---

## 🛠️ SUPER ADMIN DASHBOARD (Loopinglive Owner — You)

### Platform Management
- View all host accounts and their plan, usage, and last active date
- Manually upgrade or downgrade any account to any plan
- Impersonate any user account for debugging or support
- Feature flags — turn specific features on or off per user or globally
- Platform-wide announcement banner pushed to all logged-in users

### Revenue & Analytics
- Total webinars hosted across the platform
- Total attendees across all webinars platform-wide
- Total revenue processed through internal checkouts
- MRR (Monthly Recurring Revenue) tracker
- ARR (Annual Recurring Revenue) tracker
- New signups per day / week / month
- Churn rate tracker
- Conversion rate from free to paid

### Growth Tools
- Coupon and discount code generator
- Affiliate system — hosts can refer others and earn commission
- Referral tracking dashboard

### Support
- Built-in support ticket system or Intercom/Crisp live chat integration
- Knowledge base / help centre

---

## 💳 SAAS BILLING & PLANS

### Public Plans
- Free Plan — account created, dashboard visible, all features locked, every click leads to upgrade page
- Yearly Plan — $1,800/year — full access to all features, unlimited webinars
- Lifetime Plan — $4,800 one-time — full access forever, unlimited webinars

### Payment
- Stripe for all payments
- Payment plans / instalments supported
- Coupon codes accepted at checkout
- 30-day money-back guarantee (optional)

### Plan Enforcement
- Free users see their dashboard but cannot use any feature
- Every locked feature click redirects to the upgrade/payment page
- Admin (you) can manually grant any plan to any account from the super admin panel
- You create your own account and grant yourself lifetime access via the super admin

---

## 🌐 PUBLIC LANDING PAGE (Loopinglive.com)

- World-class marketing landing page
- Hero section with bold headline communicating the core value proposition
- Feature highlights with visuals
- Social proof section (testimonials, logos, stats)
- Pricing section with Free / Yearly / Lifetime plans
- FAQ section
- Sign up / Get Started CTA
- Short demo video or animated product preview
- Mobile fully responsive
- SEO optimised

---

## 🏗️ TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router) |
| Database | Supabase (PostgreSQL + Realtime) |
| Authentication | Supabase Auth |
| Video Hosting | Cloudinary |
| Payments | Stripe |
| Email | Resend |
| SMS + WhatsApp | Twilio |
| AI Replies | Anthropic Claude API |
| Deployment | Vercel |
| Version Control | GitHub |
| IDE | VS Code + GitHub Copilot (Claude Opus 4.5) |

---

## 🗺️ BUILD PHASES

### Phase 1 — Core Webinar Room
- Video player (Cloudinary)
- Waiting room with countdown
- Real-time chat engine (Supabase Realtime)
- Fake persona comment injection at video timestamps
- Viewer registration (name, email, phone, country)
- Mobile responsive layout

### Phase 2 — AI & Admin Live Panel
- Claude AI persona integration (2 personas)
- Admin live session panel
- Real user message highlighting
- Per-message reply button (admin only)
- AI ↔ Human toggle per persona

### Phase 3 — Admin Webinar Setup
- Video upload to Cloudinary
- Webinar scheduling engine
- Fake persona builder
- Timed comment editor with video timeline scrubber
- Timed polls, handouts, CTAs setup
- Offer button configuration

### Phase 4 — Registration & Attendee Tracking
- Registration page builder
- Custom fields and branding
- Attendee entry and attendance logging
- Watch depth tracking
- Offer click tracking
- Purchase tracking (internal + manual)

### Phase 5 — Follow-Up Automation
- Resend email sequences by segment
- Twilio SMS sequences by segment
- Twilio WhatsApp sequences by segment
- Pre-webinar reminder scheduler
- Post-webinar follow-up engine
- Replay page with time limit

### Phase 6 — Analytics & Segmentation
- Per-webinar analytics dashboard
- Per-attendee profile view
- Watch depth heatmap
- Export to CSV
- Source tracking

### Phase 7 — SaaS Billing & Public Landing
- Stripe subscription integration
- Free plan enforcement (locked dashboard)
- Yearly and Lifetime plan checkout
- Super admin panel
- Public landing page (Loopinglive.com)
- Coupon codes and affiliate system

### Phase 8 — Integrations
- Zapier webhooks
- Mailchimp, ConvertKit, ActiveCampaign, GoHighLevel
- Facebook Pixel + Google Analytics
- Calendly
- API documentation

### Phase 9 — Live Webinar (Coming Soon)
- Real-time live video broadcasting
- Screen sharing
- Live camera + microphone support
- Hybrid mode (live host + pre-recorded segments)
- Convert live webinar to automated replay with one click

---

## 🔮 FUTURE FEATURES (Roadmap)

- Live webinar mode (Phase 9)
- White label — hosts can fully brand the platform as their own
- Mobile app (iOS + Android) for attendees
- Certificate of attendance generator (PDF, auto-emailed)
- Exit survey — 1–3 questions shown when webinar ends
- Private messaging — attendee can message the host privately
- Raise hand feature — attendee signals they have a question
- Webinar templates — pre-built comment sequences for popular niches
- AI-generated fake personas — AI creates realistic names, avatars, and comments automatically
- Multi-language support for international hosts
- On-demand mode — attendee watches whenever they want, not at scheduled time
- Cele.bio integration — webinar offer page inside Cele.bio, payments via Stripe Connect

---

*Built by CC Mendel | Powered by Loopinglive.com*
*"Go live. On repeat. Forever"*
