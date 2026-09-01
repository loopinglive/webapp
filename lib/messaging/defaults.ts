import type { Channel } from "@/lib/messaging/providers";

export type TriggerType = "pre" | "post" | "re_engagement" | "buyer";

export type TemplateDef = {
  key: string;
  label: string;
  triggerType: TriggerType;
  /** Which attendee segment this targets, if any. */
  segment: string | null;
  /**
   * When it fires, in hours relative to the trigger point.
   * Negative = before session start. Positive = after session end.
   */
  offsetHours: number;
  channels: Partial<Record<Channel, { subject?: string; body: string }>>;
};

const SIGN_OFF = "{{host_name}}";

export const TEMPLATE_DEFS: TemplateDef[] = [
  // ─── Before the session ────────────────────────────────────────────────────
  {
    key: "registration_confirmation",
    label: "Registration confirmation",
    triggerType: "pre",
    segment: null,
    offsetHours: 0,
    channels: {
      email: {
        subject: "You are registered for {{webinar_title}}",
        body: `Hi {{name}},

You are officially registered for {{webinar_title}} hosted by {{host_name}}.

Your webinar details:
Date: {{webinar_date}}
Time: {{webinar_time}}
Join link: {{webinar_link}}

Keep this email — it is how you get in on the day.
We will send you reminders closer to the time.

See you there,
${SIGN_OFF}`,
      },
      sms: {
        body: `Hi {{name}}, you are registered for {{webinar_title}}!
Date: {{webinar_date}} at {{webinar_time}}
Join here: {{webinar_link}}`,
      },
      whatsapp: {
        body: `Hi {{name}} 👋

You are registered for *{{webinar_title}}*!

📅 Date: {{webinar_date}}
⏰ Time: {{webinar_time}}
🔗 Join here: {{webinar_link}}

Save this message — you will need the link to join. See you there!`,
      },
    },
  },
  {
    key: "reminder_24h",
    label: "24 hour reminder",
    triggerType: "pre",
    segment: null,
    offsetHours: -24,
    channels: {
      email: {
        subject: "Tomorrow: {{webinar_title}}",
        body: `Hi {{name}},

{{webinar_title}} is tomorrow.

Date: {{webinar_date}}
Time: {{webinar_time}}
Join link: {{webinar_link}}

${SIGN_OFF}`,
      },
      sms: {
        body: `{{webinar_title}} is tomorrow at {{webinar_time}}. Join: {{webinar_link}}`,
      },
      whatsapp: {
        body: `Hi {{name}}, *{{webinar_title}}* is tomorrow at {{webinar_time}} ⏰

🔗 {{webinar_link}}`,
      },
    },
  },
  {
    key: "reminder_1h",
    label: "1 hour reminder",
    triggerType: "pre",
    segment: null,
    offsetHours: -1,
    channels: {
      email: {
        subject: "Starting in 1 hour: {{webinar_title}}",
        body: `Hi {{name}},

{{webinar_title}} starts in one hour, at {{webinar_time}}.

Join here: {{webinar_link}}

${SIGN_OFF}`,
      },
      sms: { body: `{{webinar_title}} starts in 1 hour. Join: {{webinar_link}}` },
      whatsapp: {
        body: `⏰ *{{webinar_title}}* starts in 1 hour!

🔗 {{webinar_link}}`,
      },
    },
  },
  {
    key: "reminder_15min",
    label: "15 minute reminder",
    triggerType: "pre",
    segment: null,
    offsetHours: -0.25,
    channels: {
      email: {
        subject: "15 minutes: {{webinar_title}}",
        body: `Hi {{name}},

We go live in 15 minutes.

Join here: {{webinar_link}}

${SIGN_OFF}`,
      },
      sms: { body: `{{webinar_title}} starts in 15 min. Join: {{webinar_link}}` },
      whatsapp: {
        body: `🔔 15 minutes until *{{webinar_title}}*

🔗 {{webinar_link}}`,
      },
    },
  },
  {
    key: "reminder_now",
    label: "Starting now",
    triggerType: "pre",
    segment: null,
    offsetHours: 0,
    channels: {
      email: {
        subject: "{{webinar_title}} is STARTING NOW",
        body: `Hi {{name}},

{{webinar_title}} is starting right now!

Click here to join: {{webinar_link}}

Do not miss it — the session has already begun.

${SIGN_OFF}`,
      },
      sms: { body: `{{webinar_title}} is LIVE NOW! Join here: {{webinar_link}}` },
      whatsapp: {
        body: `🔴 *{{webinar_title}}* is LIVE NOW!

🔗 {{webinar_link}}`,
      },
    },
  },
  {
    key: "reminder_ending_soon",
    label: "Ending soon",
    triggerType: "pre",
    segment: null,
    offsetHours: 0,
    channels: {
      email: {
        subject: "Last chance to catch {{webinar_title}}",
        body: `Hi {{name}},

There is about {{time_remaining}} left of {{webinar_title}}.

You can still join: {{webinar_link}}

${SIGN_OFF}`,
      },
      sms: {
        body: `{{time_remaining}} left of {{webinar_title}}. Join: {{webinar_link}}`,
      },
      whatsapp: {
        body: `⏳ About {{time_remaining}} left of *{{webinar_title}}*

🔗 {{webinar_link}}`,
      },
    },
  },

  // ─── After the session ─────────────────────────────────────────────────────
  {
    key: "replay_access",
    label: "Replay link",
    triggerType: "post",
    segment: null,
    offsetHours: 0.5,
    channels: {
      email: {
        subject: "Your replay of {{webinar_title}}",
        body: `Hi {{name}},

Here is your replay of {{webinar_title}}:

{{replay_link}}

It stays open until {{replay_expires_at}}.

${SIGN_OFF}`,
      },
    },
  },
  {
    key: "followup_no_show",
    label: "No show",
    triggerType: "post",
    segment: "NO_SHOW",
    offsetHours: 2,
    channels: {
      email: {
        subject: "You missed {{webinar_title}} — here is the next one",
        body: `Hi {{name}},

You registered for {{webinar_title}} but could not make it.

The next session runs {{next_session_date}} at {{next_session_time}}.

Save your seat: {{webinar_link}}

${SIGN_OFF}`,
      },
      sms: {
        body: `Missed {{webinar_title}}? Next session {{next_session_date}}. Save your seat: {{webinar_link}}`,
      },
      whatsapp: {
        body: `Hi {{name}}, sorry you missed *{{webinar_title}}*.

Next session: {{next_session_date}} at {{next_session_time}}
🔗 {{webinar_link}}`,
      },
    },
  },
  {
    key: "followup_watched_low",
    label: "Watched 0–30%",
    triggerType: "post",
    segment: "WATCHED_LOW",
    offsetHours: 3,
    channels: {
      email: {
        subject: "You left {{webinar_title}} early",
        body: `Hi {{name}},

You joined {{webinar_title}} but dropped off near the start — so you missed the part that matters most.

The next session runs {{next_session_date}}: {{webinar_link}}

${SIGN_OFF}`,
      },
      sms: {
        body: `You left {{webinar_title}} early. Next session {{next_session_date}}: {{webinar_link}}`,
      },
      whatsapp: {
        body: `Hi {{name}}, you left *{{webinar_title}}* early and missed the best part.

Next session: {{next_session_date}}
🔗 {{webinar_link}}`,
      },
    },
  },
  {
    key: "followup_watched_mid_low",
    label: "Watched 30–50%",
    triggerType: "post",
    segment: "WATCHED_MID_LOW",
    offsetHours: 3,
    channels: {
      email: {
        subject: "You got halfway through {{webinar_title}}",
        body: `Hi {{name}},

You made it partway through {{webinar_title}} — the section on {{offer_title}} comes after where you stopped.

Pick it up here: {{offer_url}}
Or catch the next session on {{next_session_date}}.

${SIGN_OFF}`,
      },
      sms: {
        body: `You stopped partway through {{webinar_title}}. Here is what you missed: {{offer_url}}`,
      },
      whatsapp: {
        body: `Hi {{name}}, you got partway through *{{webinar_title}}*.

The part about {{offer_title}} comes right after where you stopped.
🔗 {{offer_url}}`,
      },
    },
  },
  {
    key: "followup_watched_mid_high",
    label: "Watched 50–70%",
    triggerType: "post",
    segment: "WATCHED_MID_HIGH",
    offsetHours: 2,
    channels: {
      email: {
        subject: "About {{offer_title}}",
        body: `Hi {{name}},

You watched most of {{webinar_title}} — thank you.

Here is {{offer_title}} in full: {{offer_url}}

${SIGN_OFF}`,
      },
      sms: { body: `{{offer_title}} is here: {{offer_url}}` },
      whatsapp: {
        body: `Hi {{name}}, you watched most of *{{webinar_title}}*.

Here is {{offer_title}}: {{offer_url}}`,
      },
    },
  },
  {
    key: "followup_watched_high",
    label: "Watched 70–90%",
    triggerType: "post",
    segment: "WATCHED_HIGH",
    offsetHours: 1,
    channels: {
      email: {
        subject: "{{offer_title}} — still open",
        body: `Hi {{name}},

You watched nearly all of {{webinar_title}}, so you saw the whole framework.

{{offer_title}} is still open: {{offer_url}}
{{offer_countdown}}

${SIGN_OFF}`,
      },
      sms: { body: `{{offer_title}} is still open: {{offer_url}}` },
      whatsapp: {
        body: `Hi {{name}}, you saw nearly all of *{{webinar_title}}*.

{{offer_title}} is still open 👉 {{offer_url}}`,
      },
    },
  },
  {
    key: "followup_watched_complete",
    label: "Watched 90–100%",
    triggerType: "post",
    segment: "WATCHED_COMPLETE",
    offsetHours: 0.5,
    channels: {
      email: {
        subject: "You watched the whole thing, {{name}}",
        body: `Hi {{name}},

You stayed to the end of {{webinar_title}} — that puts you in a small group.

{{offer_title}}: {{offer_url}}
{{offer_countdown}}

${SIGN_OFF}`,
      },
      sms: { body: `You watched it all. {{offer_title}}: {{offer_url}}` },
      whatsapp: {
        body: `{{name}}, you stayed to the end of *{{webinar_title}}* 🙌

{{offer_title}} 👉 {{offer_url}}`,
      },
    },
  },
  {
    key: "followup_clicked_offer",
    label: "Clicked but did not buy",
    triggerType: "post",
    segment: "CLICKED_OFFER",
    offsetHours: 1,
    channels: {
      email: {
        subject: "Did you see the offer, {{name}}?",
        body: `Hi {{name}},

I noticed you clicked on {{offer_title}} during the webinar but did not complete your purchase.

I wanted to reach out personally in case you had any questions.

The offer is still available here: {{offer_url}}

${SIGN_OFF}`,
      },
      sms: {
        body: `{{name}}, you looked at {{offer_title}} but did not finish. Still open: {{offer_url}}`,
      },
      whatsapp: {
        body: `Hi {{name}}, you opened {{offer_title}} but did not finish checking out.

Any questions? It is still here 👉 {{offer_url}}`,
      },
    },
  },

  // ─── Buyers ────────────────────────────────────────────────────────────────
  {
    key: "buyer_confirmation",
    label: "Buyer confirmation",
    triggerType: "buyer",
    segment: "BOUGHT",
    offsetHours: 0,
    channels: {
      email: {
        subject: "Welcome aboard, {{name}}!",
        body: `Hi {{name}},

Thank you for your purchase of {{offer_title}}!

We are so excited to have you on board.
You will receive the next steps shortly.

${SIGN_OFF}`,
      },
    },
  },

  // ─── Re-engagement ─────────────────────────────────────────────────────────
  {
    key: "re_engagement_initial",
    label: "Re-engagement (first)",
    triggerType: "re_engagement",
    segment: null,
    offsetHours: 0,
    channels: {
      email: {
        subject: "Still thinking about {{webinar_title}}?",
        body: `Hi {{name}},

It has been a while since you joined {{webinar_title}}.

We run it again on {{next_session_date}} at {{next_session_time}} if you would like a fresh look.

Save a seat: {{webinar_link}}

${SIGN_OFF}`,
      },
      sms: {
        body: `{{webinar_title}} runs again {{next_session_date}}. Save a seat: {{webinar_link}}`,
      },
      whatsapp: {
        body: `Hi {{name}}, *{{webinar_title}}* runs again on {{next_session_date}}.

🔗 {{webinar_link}}`,
      },
    },
  },
  {
    key: "re_engagement_weekly",
    label: "Re-engagement (recurring)",
    triggerType: "re_engagement",
    segment: null,
    offsetHours: 0,
    channels: {
      email: {
        subject: "{{webinar_title}} — next session {{next_session_date}}",
        body: `Hi {{name}},

The next {{webinar_title}} session is {{next_session_date}} at {{next_session_time}}.

Save a seat: {{webinar_link}}

${SIGN_OFF}`,
      },
      sms: {
        body: `Next {{webinar_title}}: {{next_session_date}}. {{webinar_link}}`,
      },
      whatsapp: {
        body: `Next *{{webinar_title}}* session: {{next_session_date}} at {{next_session_time}}

🔗 {{webinar_link}}`,
      },
    },
  },
];

export const TEMPLATE_BY_KEY = new Map(
  TEMPLATE_DEFS.map((def) => [def.key, def])
);

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  pre: "Pre-webinar",
  post: "Post-webinar",
  re_engagement: "Re-engagement",
  buyer: "Buyer",
};
