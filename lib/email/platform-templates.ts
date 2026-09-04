import { renderEmail } from "@/lib/email/render";
import { resolveTemplate } from "@/lib/messaging/templates";

/**
 * Platform email — everything the product sends on its own behalf.
 *
 * Deliberately separate from TEMPLATE_DEFS. Those are per-webinar, seeded into
 * automation_templates, and edited by hosts. These are platform messages: one
 * copy for everyone, versioned in code, never editable from the admin panel.
 * Mixing the two would let a host rewrite their own password-reset email.
 */

export type Audience = "host" | "attendee";

export type Category =
  | "account"
  | "activation"
  | "operations"
  | "billing"
  | "compliance"
  | "team"
  | "attendee";

export type PlatformTemplate = {
  key: string;
  label: string;
  audience: Audience;
  category: Category;
  subject: string;
  eyebrow?: string;
  /** Defaults to the resolved subject. */
  heading?: string;
  body: string;
  cta?: { label: string; url: string };
  meta?: { label: string; value: string }[];
  /**
   * A service message about someone's own account or purchase.
   *
   * Transactional mail carries no unsubscribe link — opting out of a password
   * reset is not a thing a person can meaningfully do, and offering it in a
   * receipt invites them to unsubscribe from mail they actually need.
   */
  transactional: boolean;
};

export const PLATFORM_TEMPLATES: PlatformTemplate[] = [
  // ───────────────────────── Account & security ─────────────────────────
  {
    key: "host_welcome",
    label: "Welcome",
    audience: "host",
    category: "account",
    transactional: true,
    subject: "Welcome to {{brand}}",
    eyebrow: "Welcome",
    body: `Hi {{host_name}},

Your {{brand}} account is ready.

{{brand}} runs your best webinar on a schedule — the same recording, playing as a live event, with a chat room that fills up around it. You record once, and it sells while you sleep.

The fastest way to see it work is to build one:

- Upload a video and pick your session times
- Add a handful of personas so the room feels alive
- Set your offer and when it appears

We will be here if anything snags.`,
    cta: { label: "Create your first webinar", url: "{{dashboard_url}}" },
  },
  {
    key: "host_verify_email",
    label: "Verify email address",
    audience: "host",
    category: "account",
    transactional: true,
    subject: "Confirm your email address",
    eyebrow: "One step left",
    body: `Hi {{host_name}},

Confirm this address and your {{brand}} account is live.

This link expires in {{expires_in}}. If you did not create an account, you can ignore this email and nothing will happen.`,
    cta: { label: "Confirm my email", url: "{{action_url}}" },
  },
  {
    key: "host_password_reset",
    label: "Password reset",
    audience: "host",
    category: "account",
    transactional: true,
    subject: "Reset your {{brand}} password",
    eyebrow: "Password reset",
    body: `Hi {{host_name}},

Use the button below to choose a new password. The link expires in {{expires_in}} and can only be used once.

If you did not ask for this, no action is needed — your password has not changed. It is worth a look at your account security if you were not expecting it.`,
    cta: { label: "Choose a new password", url: "{{action_url}}" },
  },
  {
    key: "host_password_changed",
    label: "Password changed",
    audience: "host",
    category: "account",
    transactional: true,
    subject: "Your password was changed",
    eyebrow: "Security",
    body: `Hi {{host_name}},

The password on your {{brand}} account was changed on {{event_time}}.

If that was you, there is nothing to do.

If it was not, your account may be compromised. Reset your password immediately and contact us at {{support_email}}.`,
    meta: [
      { label: "When", value: "{{event_time}}" },
      { label: "Where from", value: "{{event_location}}" },
    ],
    cta: { label: "Secure my account", url: "{{security_url}}" },
  },
  {
    key: "host_email_changed",
    label: "Email address changed",
    audience: "host",
    category: "account",
    transactional: true,
    subject: "Your account email was changed",
    eyebrow: "Security",
    body: `Hi {{host_name}},

The email address on your {{brand}} account changed from {{old_email}} to {{new_email}}.

This notice goes to both addresses. If you did not make this change, contact us at {{support_email}} straight away — whoever made it can now receive your password resets.`,
    meta: [
      { label: "Previous address", value: "{{old_email}}" },
      { label: "New address", value: "{{new_email}}" },
    ],
    cta: { label: "Review account activity", url: "{{security_url}}" },
  },
  {
    key: "host_new_device_signin",
    label: "New device sign-in",
    audience: "host",
    category: "account",
    transactional: true,
    subject: "New sign-in to your {{brand}} account",
    eyebrow: "Security",
    body: `Hi {{host_name}},

Someone signed in to your account from a device we have not seen before.

If this was you, carry on. If not, change your password now.`,
    meta: [
      { label: "When", value: "{{event_time}}" },
      { label: "Device", value: "{{device}}" },
      { label: "Location", value: "{{event_location}}" },
    ],
    cta: { label: "This was not me", url: "{{security_url}}" },
  },
  {
    key: "host_account_deleted",
    label: "Account deleted",
    audience: "host",
    category: "account",
    transactional: true,
    subject: "Your {{brand}} account has been deleted",
    eyebrow: "Account closed",
    body: `Hi {{host_name}},

Your account and its data have been deleted, as you asked.

That covers your webinars, recordings, registrant lists and analytics. It cannot be undone, and we have kept nothing beyond what the law requires us to.

If you ever want to start again, you are welcome back.`,
  },

  // ───────────────────────── Activation ─────────────────────────
  {
    key: "host_no_webinar_yet",
    label: "No webinar created yet",
    audience: "host",
    category: "activation",
    transactional: false,
    subject: "Your first webinar takes about ten minutes",
    eyebrow: "Getting started",
    body: `Hi {{host_name}},

You signed up a few days ago and have not built a webinar yet. If something got in the way, it is worth knowing the first one is quicker than people expect.

You need three things:

- A video you have already recorded
- The times you want it to run
- An offer to send people to at the end

Everything else — the chat, the personas, the reminders — we handle.`,
    cta: { label: "Build my first webinar", url: "{{dashboard_url}}" },
  },
  {
    key: "host_setup_incomplete",
    label: "Setup left incomplete",
    audience: "host",
    category: "activation",
    transactional: false,
    subject: "{{webinar_title}} is nearly ready",
    eyebrow: "Almost there",
    body: `Hi {{host_name}},

{{webinar_title}} is sitting as a draft with {{steps_remaining}} to finish before it can go live:

{{steps_list}}

Nobody can register until it is published.`,
    meta: [
      { label: "Webinar", value: "{{webinar_title}}" },
      { label: "Progress", value: "{{steps_done}} of {{steps_total}} complete" },
    ],
    cta: { label: "Finish setup", url: "{{webinar_url}}" },
  },
  {
    key: "host_first_webinar_published",
    label: "First webinar published",
    audience: "host",
    category: "activation",
    transactional: false,
    subject: "{{webinar_title}} is live",
    eyebrow: "Published",
    body: `Hi {{host_name}},

{{webinar_title}} is published and taking registrations.

Here is your registration link — put it anywhere you send traffic:

{{registration_url}}

The next session runs {{next_session}}. Every registrant gets a confirmation and reminders automatically, so the only thing left is getting people to the page.`,
    meta: [
      { label: "Webinar", value: "{{webinar_title}}" },
      { label: "Next session", value: "{{next_session}}" },
    ],
    cta: { label: "View registration page", url: "{{registration_url}}" },
  },
  {
    key: "host_first_registrant",
    label: "First registrant",
    audience: "host",
    category: "activation",
    transactional: false,
    subject: "{{registrant_name}} just registered for {{webinar_title}}",
    eyebrow: "First registration",
    body: `Hi {{host_name}},

You have your first registration.

{{registrant_name}} signed up for {{webinar_title}} and is booked onto the {{session_time}} session. They have their confirmation, and their reminders are queued.

This is the part where it stops being theoretical.`,
    meta: [
      { label: "Registrant", value: "{{registrant_name}}" },
      { label: "Session", value: "{{session_time}}" },
    ],
    cta: { label: "See who is coming", url: "{{attendees_url}}" },
  },
  {
    key: "host_first_sale",
    label: "First sale",
    audience: "host",
    category: "activation",
    transactional: false,
    subject: "You made your first sale on {{brand}}",
    eyebrow: "First sale",
    body: `Hi {{host_name}},

{{buyer_name}} bought {{offer_title}} during {{webinar_title}}.

That is a recording you made once, selling on its own schedule. It will keep running.`,
    meta: [
      { label: "Buyer", value: "{{buyer_name}}" },
      { label: "Offer", value: "{{offer_title}}" },
      { label: "Amount", value: "{{amount}}" },
    ],
    cta: { label: "See the numbers", url: "{{analytics_url}}" },
  },
  {
    key: "host_registrant_milestone",
    label: "Registrant milestone",
    audience: "host",
    category: "activation",
    transactional: false,
    subject: "{{milestone}} people have registered for {{webinar_title}}",
    eyebrow: "Milestone",
    body: `Hi {{host_name}},

{{webinar_title}} has passed {{milestone}} registrations.

Worth checking which sessions and which traffic sources are pulling — the ones that convert are rarely the ones you would guess.`,
    meta: [
      { label: "Webinar", value: "{{webinar_title}}" },
      { label: "Registrations", value: "{{milestone}}" },
    ],
    cta: { label: "Open analytics", url: "{{analytics_url}}" },
  },

  // ───────────────────────── Operations ─────────────────────────
  {
    key: "host_video_processing_complete",
    label: "Video ready",
    audience: "host",
    category: "operations",
    transactional: true,
    subject: "Your video for {{webinar_title}} is ready",
    eyebrow: "Processing complete",
    body: `Hi {{host_name}},

{{video_name}} has finished processing and is attached to {{webinar_title}}.

Runtime is {{video_duration}}. You can now place your timed comments and set when the offer appears.`,
    meta: [
      { label: "Webinar", value: "{{webinar_title}}" },
      { label: "Runtime", value: "{{video_duration}}" },
    ],
    cta: { label: "Add timed comments", url: "{{comments_url}}" },
  },
  {
    key: "host_video_processing_failed",
    label: "Video processing failed",
    audience: "host",
    category: "operations",
    transactional: true,
    subject: "Your video for {{webinar_title}} could not be processed",
    eyebrow: "Action needed",
    body: `Hi {{host_name}},

{{video_name}} failed to process, so {{webinar_title}} has no video attached and cannot run.

Reason given: {{failure_reason}}

Re-uploading usually fixes it. If it fails again, send us the file name at {{support_email}} and we will look at it directly.`,
    meta: [
      { label: "Webinar", value: "{{webinar_title}}" },
      { label: "Next session", value: "{{next_session}}" },
    ],
    cta: { label: "Upload again", url: "{{webinar_url}}" },
  },
  {
    key: "host_session_starting_soon",
    label: "Session starting soon",
    audience: "host",
    category: "operations",
    transactional: false,
    subject: "{{webinar_title}} starts in an hour",
    eyebrow: "Starting soon",
    body: `Hi {{host_name}},

{{webinar_title}} goes live at {{session_time}} with {{registered_count}} people registered.

You do not need to be there — it runs itself. But the live panel lets you watch the room fill up and step into the chat if you want to.`,
    meta: [
      { label: "Starts", value: "{{session_time}}" },
      { label: "Registered", value: "{{registered_count}}" },
    ],
    cta: { label: "Open the live panel", url: "{{live_url}}" },
  },
  {
    key: "host_session_recap",
    label: "Session recap",
    audience: "host",
    category: "operations",
    transactional: false,
    subject: "{{webinar_title}}: {{attended_count}} attended, {{bought_count}} bought",
    eyebrow: "Session recap",
    body: `Hi {{host_name}},

Your {{session_time}} session has finished.

{{attended_count}} of {{registered_count}} registrants turned up, and they watched {{avg_watch}} of the video on average. {{clicked_count}} clicked the offer and {{bought_count}} bought, for {{revenue}}.

The sharpest drop-off was at {{biggest_drop}} — the minute where you lost the most people at once. If you change one thing before the next run, change what happens there.`,
    meta: [
      { label: "Attended", value: "{{attended_count}} of {{registered_count}}" },
      { label: "Average watch", value: "{{avg_watch}}" },
      { label: "Revenue", value: "{{revenue}}" },
    ],
    cta: { label: "See the full breakdown", url: "{{analytics_url}}" },
  },
  {
    key: "host_low_registrations",
    label: "Low registrations warning",
    audience: "host",
    category: "operations",
    transactional: false,
    subject: "{{webinar_title}} runs tomorrow with {{registered_count}} registered",
    eyebrow: "Heads up",
    body: `Hi {{host_name}},

Tomorrow's session of {{webinar_title}} has {{registered_count}} registrations.

There is still time. The registration link works right up to the moment the session starts, and people who register in the last day tend to show up at a higher rate than those who registered weeks ago:

{{registration_url}}`,
    meta: [
      { label: "Session", value: "{{session_time}}" },
      { label: "Registered", value: "{{registered_count}}" },
    ],
    cta: { label: "Share the registration link", url: "{{registration_url}}" },
  },
  {
    key: "host_weekly_digest",
    label: "Weekly digest",
    audience: "host",
    category: "operations",
    transactional: false,
    subject: "Your week on {{brand}}",
    eyebrow: "Weekly digest",
    body: `Hi {{host_name}},

Here is how the last seven days went across every webinar.

{{registrations_count}} people registered and {{attended_count}} attended. {{bought_count}} bought, for {{revenue}}.

Your strongest performer was {{top_webinar}}, converting at {{top_conversion}}.`,
    meta: [
      { label: "Registrations", value: "{{registrations_count}}" },
      { label: "Attendees", value: "{{attended_count}}" },
      { label: "Revenue", value: "{{revenue}}" },
    ],
    cta: { label: "Open analytics", url: "{{analytics_url}}" },
  },
  {
    key: "host_delivery_problem",
    label: "Email delivery problem",
    audience: "host",
    category: "operations",
    transactional: true,
    subject: "Some of your emails are not being delivered",
    eyebrow: "Action needed",
    body: `Hi {{host_name}},

{{bounce_count}} of your recent emails bounced and those addresses have been suppressed, which means further messages to them are not sent at all.

This matters more than it sounds: your dashboard still counts those people as registrants, so your reminders look like they are working when they are not reaching anyone.

Reason most often given: {{bounce_reason}}`,
    meta: [
      { label: "Affected addresses", value: "{{bounce_count}}" },
      { label: "Sending domain", value: "{{sending_domain}}" },
    ],
    cta: { label: "Review affected registrants", url: "{{attendees_url}}" },
  },

  // ───────────────────────── Billing ─────────────────────────
  {
    key: "host_trial_started",
    label: "Trial started",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Your {{brand}} trial has started",
    eyebrow: "Trial",
    body: `Hi {{host_name}},

Your {{trial_days}}-day trial is running. Everything is unlocked — unlimited webinars, the full automation engine, and the analytics.

Nothing is charged today. We will remind you before the trial ends, and you can cancel any time up to that point without paying anything.`,
    meta: [
      { label: "Plan", value: "{{plan_name}}" },
      { label: "Trial ends", value: "{{trial_end_date}}" },
    ],
    cta: { label: "Start building", url: "{{dashboard_url}}" },
  },
  {
    key: "host_trial_ending_3d",
    label: "Trial ending in 3 days",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Your trial ends in 3 days",
    eyebrow: "Trial ending",
    body: `Hi {{host_name}},

Your {{brand}} trial ends on {{trial_end_date}}, and {{plan_name}} begins at {{plan_price}} unless you cancel.

In the trial so far you have run {{sessions_count}} sessions and picked up {{registrations_count}} registrations. Those keep running if you continue, and pause if you do not.`,
    meta: [
      { label: "Trial ends", value: "{{trial_end_date}}" },
      { label: "Then", value: "{{plan_price}}" },
    ],
    cta: { label: "Review your plan", url: "{{billing_url}}" },
  },
  {
    key: "host_trial_ending_tomorrow",
    label: "Trial ending tomorrow",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Your trial ends tomorrow",
    eyebrow: "Last day",
    body: `Hi {{host_name}},

Tomorrow your trial ends and {{plan_name}} starts at {{plan_price}}.

If you want to stop, cancel today and you will not be charged. If you are staying, there is nothing to do.`,
    meta: [
      { label: "Charged on", value: "{{trial_end_date}}" },
      { label: "Amount", value: "{{plan_price}}" },
    ],
    cta: { label: "Manage billing", url: "{{billing_url}}" },
  },
  {
    key: "host_trial_ended",
    label: "Trial ended",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Your trial has ended",
    eyebrow: "Trial ended",
    body: `Hi {{host_name}},

Your trial has finished and your account has moved to the free tier.

Your webinars, recordings and registrant lists are all still here. Scheduled sessions are paused until you choose a plan, and nothing has been deleted.`,
    cta: { label: "Choose a plan", url: "{{billing_url}}" },
  },
  {
    key: "host_payment_receipt",
    label: "Payment receipt",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Your {{brand}} receipt — {{amount}}",
    eyebrow: "Receipt",
    body: `Hi {{host_name}},

Thanks — your payment went through.

This covers {{plan_name}} from {{period_start}} to {{period_end}}. Your next payment is due {{next_payment_date}}.`,
    meta: [
      { label: "Amount", value: "{{amount}}" },
      { label: "Plan", value: "{{plan_name}}" },
      { label: "Invoice", value: "{{invoice_number}}" },
    ],
    cta: { label: "Download invoice", url: "{{invoice_url}}" },
  },
  {
    key: "host_payment_failed",
    label: "Payment failed",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "We could not take your payment",
    eyebrow: "Payment failed",
    body: `Hi {{host_name}},

Your payment of {{amount}} did not go through. Your card issuer said: {{failure_reason}}

Nothing has changed on your account yet. We will try again on {{retry_date}}, and updating your card before then will settle it immediately.`,
    meta: [
      { label: "Amount due", value: "{{amount}}" },
      { label: "Next attempt", value: "{{retry_date}}" },
    ],
    cta: { label: "Update payment method", url: "{{billing_url}}" },
  },
  {
    key: "host_payment_retry",
    label: "Payment retry failed",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Second attempt failed — action needed",
    eyebrow: "Payment failed",
    body: `Hi {{host_name}},

We tried your card again and it was declined a second time.

Your webinars are still running. If the payment has not cleared by {{final_date}}, scheduled sessions will pause — which means registrants who are already booked will not get their session.

Updating your card takes a minute and fixes it straight away.`,
    meta: [
      { label: "Amount due", value: "{{amount}}" },
      { label: "Sessions pause", value: "{{final_date}}" },
    ],
    cta: { label: "Update payment method", url: "{{billing_url}}" },
  },
  {
    key: "host_payment_final_notice",
    label: "Final payment notice",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Final notice: your sessions pause tomorrow",
    eyebrow: "Final notice",
    body: `Hi {{host_name}},

This is the last attempt. Tomorrow your scheduled sessions stop running and your registration pages go offline.

{{registered_count}} people are currently registered for upcoming sessions. They will not be told, and they will find a page that no longer works.

Nothing is deleted, and everything restarts the moment a payment clears.`,
    meta: [
      { label: "Amount due", value: "{{amount}}" },
      { label: "People affected", value: "{{registered_count}}" },
    ],
    cta: { label: "Settle now", url: "{{billing_url}}" },
  },
  {
    key: "host_card_expiring",
    label: "Card expiring",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Your card expires next month",
    eyebrow: "Card expiring",
    body: `Hi {{host_name}},

The card ending {{card_last4}} expires {{card_expiry}}, which is before your next payment on {{next_payment_date}}.

Updating it now avoids a failed payment and the interruption that follows.`,
    meta: [
      { label: "Card", value: "•••• {{card_last4}}" },
      { label: "Expires", value: "{{card_expiry}}" },
    ],
    cta: { label: "Update card", url: "{{billing_url}}" },
  },
  {
    key: "host_plan_changed",
    label: "Plan changed",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Your plan is now {{plan_name}}",
    eyebrow: "Plan updated",
    body: `Hi {{host_name}},

Your plan has changed from {{previous_plan}} to {{plan_name}}, effective {{effective_date}}.

{{proration_note}}`,
    meta: [
      { label: "New plan", value: "{{plan_name}}" },
      { label: "From", value: "{{effective_date}}" },
    ],
    cta: { label: "View billing", url: "{{billing_url}}" },
  },
  {
    key: "host_subscription_cancelled",
    label: "Subscription cancelled",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "Your subscription has been cancelled",
    eyebrow: "Cancelled",
    body: `Hi {{host_name}},

Your {{plan_name}} subscription is cancelled. You keep full access until {{access_until}}, and you will not be charged again.

Your webinars and data stay put after that — scheduled sessions simply stop running.

If there was something specific that did not work, we would genuinely like to know: {{support_email}}`,
    meta: [
      { label: "Access until", value: "{{access_until}}" },
    ],
    cta: { label: "Reactivate", url: "{{billing_url}}" },
  },
  {
    key: "host_usage_limit_approaching",
    label: "Usage limit approaching",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "You are near your monthly limit",
    eyebrow: "Usage",
    body: `Hi {{host_name}},

You have used {{usage_current}} of your {{usage_limit}} {{usage_unit}} this month, with {{days_remaining}} days to go.

Past the limit, new registrations are turned away rather than queued — so it is worth deciding before you get there.`,
    meta: [
      { label: "Used", value: "{{usage_current}} of {{usage_limit}}" },
      { label: "Resets", value: "{{reset_date}}" },
    ],
    cta: { label: "Review limits", url: "{{billing_url}}" },
  },
  {
    key: "host_usage_limit_reached",
    label: "Usage limit reached",
    audience: "host",
    category: "billing",
    transactional: true,
    subject: "You have hit your monthly limit",
    eyebrow: "Limit reached",
    body: `Hi {{host_name}},

You have reached {{usage_limit}} {{usage_unit}} for this month, so new registrations are being turned away.

Sessions already scheduled still run and people already registered are unaffected. The limit resets on {{reset_date}}.`,
    meta: [
      { label: "Limit", value: "{{usage_limit}} {{usage_unit}}" },
      { label: "Resets", value: "{{reset_date}}" },
    ],
    cta: { label: "Raise my limit", url: "{{billing_url}}" },
  },

  // ───────────────────────── Team ─────────────────────────
  {
    key: "team_invitation",
    label: "Team invitation",
    audience: "host",
    category: "team",
    transactional: true,
    subject: "{{inviter_name}} invited you to {{workspace_name}}",
    eyebrow: "Invitation",
    body: `Hi,

{{inviter_name}} has invited you to join {{workspace_name}} on {{brand}} as {{role_name}}.

This invitation expires in {{expires_in}}.`,
    meta: [
      { label: "Workspace", value: "{{workspace_name}}" },
      { label: "Role", value: "{{role_name}}" },
    ],
    cta: { label: "Accept invitation", url: "{{action_url}}" },
  },
  {
    key: "team_invitation_accepted",
    label: "Invitation accepted",
    audience: "host",
    category: "team",
    transactional: true,
    subject: "{{member_name}} has joined {{workspace_name}}",
    eyebrow: "Team",
    body: `Hi {{host_name}},

{{member_name}} accepted your invitation and now has {{role_name}} access to {{workspace_name}}.`,
    cta: { label: "Manage team", url: "{{team_url}}" },
  },
  {
    key: "team_role_changed",
    label: "Role changed",
    audience: "host",
    category: "team",
    transactional: true,
    subject: "Your role in {{workspace_name}} has changed",
    eyebrow: "Team",
    body: `Hi {{member_name}},

{{inviter_name}} changed your role in {{workspace_name}} from {{previous_role}} to {{role_name}}.

What you can see and change has moved with it.`,
    meta: [{ label: "New role", value: "{{role_name}}" }],
    cta: { label: "Open workspace", url: "{{dashboard_url}}" },
  },
  {
    key: "team_access_removed",
    label: "Access removed",
    audience: "host",
    category: "team",
    transactional: true,
    subject: "Your access to {{workspace_name}} has been removed",
    eyebrow: "Team",
    body: `Hi {{member_name}},

You no longer have access to {{workspace_name}} on {{brand}}.

Anything you created stays with the workspace. If this looks like a mistake, speak to {{inviter_name}}.`,
  },

  // ───────────────────────── Compliance (host) ─────────────────────────
  {
    key: "host_data_export_ready",
    label: "Data export ready",
    audience: "host",
    category: "compliance",
    transactional: true,
    subject: "Your data export is ready",
    eyebrow: "Data export",
    body: `Hi {{host_name}},

The export you asked for is ready. It contains your webinars, registrant lists, message logs and analytics as CSV files.

The link expires in {{expires_in}} for security, after which you can request another.`,
    cta: { label: "Download export", url: "{{action_url}}" },
  },
  {
    key: "host_data_deleted",
    label: "Data deletion confirmed",
    audience: "host",
    category: "compliance",
    transactional: true,
    subject: "Your data has been deleted",
    eyebrow: "Deletion confirmed",
    body: `Hi {{host_name}},

The data you asked us to delete has been removed from our systems, including backups on their next cycle.

This covers {{deleted_summary}}. It cannot be recovered.`,
  },

  // ───────────────────────── Attendee ─────────────────────────
  {
    key: "attendee_session_rescheduled",
    label: "Session rescheduled",
    audience: "attendee",
    category: "attendee",
    transactional: true,
    subject: "New time for {{webinar_title}}",
    eyebrow: "Time changed",
    body: `Hi {{name}},

The session you registered for has moved.

It was {{old_session_time}}. It now runs {{session_time}}.

Your place is carried over — you do not need to register again, and your reminders have been rescheduled. The calendar invite attached to this email replaces the old one.`,
    meta: [
      { label: "Webinar", value: "{{webinar_title}}" },
      { label: "New time", value: "{{session_time}}" },
    ],
    cta: { label: "View the new time", url: "{{webinar_link}}" },
  },
  {
    key: "attendee_session_cancelled",
    label: "Session cancelled",
    audience: "attendee",
    category: "attendee",
    transactional: true,
    subject: "{{webinar_title}} on {{session_time}} has been cancelled",
    eyebrow: "Cancelled",
    body: `Hi {{name}},

The {{session_time}} session of {{webinar_title}} is no longer running, and we are sorry for the wasted diary space.

{{next_session_note}}

You will not receive any further reminders for the cancelled session.`,
    cta: { label: "See other sessions", url: "{{webinar_link}}" },
  },
  {
    key: "attendee_double_optin",
    label: "Confirm your registration",
    audience: "attendee",
    category: "attendee",
    transactional: true,
    subject: "Confirm your place at {{webinar_title}}",
    eyebrow: "One step left",
    body: `Hi {{name}},

Almost done. Confirm your email and your seat at {{webinar_title}} is held.

Until you confirm, we will not send you anything else — including the reminders you would need to actually attend.`,
    meta: [
      { label: "Webinar", value: "{{webinar_title}}" },
      { label: "Session", value: "{{session_time}}" },
    ],
    cta: { label: "Confirm my place", url: "{{action_url}}" },
  },
  {
    key: "attendee_unsubscribe_confirmed",
    label: "Unsubscribe confirmed",
    audience: "attendee",
    category: "attendee",
    transactional: true,
    subject: "You have been unsubscribed",
    eyebrow: "Unsubscribed",
    body: `Hi {{name}},

You will not receive any more emails about {{webinar_title}}.

If you are still registered for an upcoming session, your place is unaffected — you simply will not be reminded about it.

Unsubscribed by mistake? {{resubscribe_note}}`,
  },
  {
    key: "attendee_replay_expiring",
    label: "Replay expiring",
    audience: "attendee",
    category: "attendee",
    transactional: false,
    subject: "Your replay of {{webinar_title}} expires tomorrow",
    eyebrow: "Expires soon",
    body: `Hi {{name}},

Your replay link stops working {{replay_expires_at}}.

If you have not watched it yet, or only got part of the way through, this is the last chance.`,
    meta: [{ label: "Expires", value: "{{replay_expires_at}}" }],
    cta: { label: "Watch the replay", url: "{{replay_link}}" },
  },
  {
    key: "attendee_offer_closing",
    label: "Offer closing",
    audience: "attendee",
    category: "attendee",
    transactional: false,
    subject: "{{offer_title}} closes {{offer_closes_at}}",
    eyebrow: "Closing soon",
    body: `Hi {{name}},

{{offer_title}} comes down {{offer_closes_at}}.

After that the page stops taking orders. No countdown tricks — it simply will not be available at this price again.`,
    meta: [
      { label: "Offer", value: "{{offer_title}}" },
      { label: "Closes", value: "{{offer_closes_at}}" },
    ],
    cta: { label: "Get it before it closes", url: "{{offer_url}}" },
  },
  {
    key: "attendee_purchase_receipt",
    label: "Purchase receipt",
    audience: "attendee",
    category: "attendee",
    transactional: true,
    subject: "Your receipt for {{offer_title}}",
    eyebrow: "Receipt",
    body: `Hi {{name}},

Thanks for your purchase. Here is your receipt, and your access details are below.

Keep this email — it is how you get back in.`,
    meta: [
      { label: "Item", value: "{{offer_title}}" },
      { label: "Amount", value: "{{amount}}" },
      { label: "Date", value: "{{purchase_date}}" },
    ],
    cta: { label: "Access your purchase", url: "{{access_url}}" },
  },
  {
    key: "attendee_refund_confirmed",
    label: "Refund confirmed",
    audience: "attendee",
    category: "attendee",
    transactional: true,
    subject: "Your refund for {{offer_title}}",
    eyebrow: "Refunded",
    body: `Hi {{name}},

Your refund of {{amount}} has been processed.

Depending on your bank it will appear within {{refund_days}}. Your access to {{offer_title}} has ended.`,
    meta: [
      { label: "Amount", value: "{{amount}}" },
      { label: "Expect it within", value: "{{refund_days}}" },
    ],
  },
  {
    key: "attendee_feedback_request",
    label: "Feedback request",
    audience: "attendee",
    category: "attendee",
    transactional: false,
    subject: "What did you think of {{webinar_title}}?",
    eyebrow: "One question",
    body: `Hi {{name}},

You watched {{webinar_title}} yesterday. One question, and it takes a few seconds to answer:

Would you recommend it to someone in your position?

That is the whole survey.`,
    cta: { label: "Answer in one click", url: "{{feedback_url}}" },
  },
  {
    key: "attendee_waitlist_joined",
    label: "Waitlist joined",
    audience: "attendee",
    category: "attendee",
    transactional: true,
    subject: "You are on the waitlist for {{webinar_title}}",
    eyebrow: "Waitlisted",
    body: `Hi {{name}},

The {{session_time}} session is full, so you are on the waitlist.

If a place opens we will email you immediately — but only if you can act quickly, since places tend to go the same day. There are other sessions running if you would rather take a guaranteed seat.`,
    meta: [
      { label: "Webinar", value: "{{webinar_title}}" },
      { label: "Position", value: "{{waitlist_position}}" },
    ],
    cta: { label: "See other sessions", url: "{{webinar_link}}" },
  },
  {
    key: "attendee_waitlist_promoted",
    label: "Waitlist place available",
    audience: "attendee",
    category: "attendee",
    transactional: true,
    subject: "A place has opened for {{webinar_title}}",
    eyebrow: "You are in",
    body: `Hi {{name}},

A place has come up on the {{session_time}} session and it is yours.

You are registered — nothing further to do. Your reminders are already queued.`,
    meta: [
      { label: "Webinar", value: "{{webinar_title}}" },
      { label: "Session", value: "{{session_time}}" },
    ],
    cta: { label: "View your seat", url: "{{webinar_link}}" },
  },
  {
    key: "host_team_invitation",
    label: "Team invitation",
    audience: "host",
    category: "team",
    transactional: true,
    subject: "{{inviter_name}} invited you to {{team_name}} on Loopinglive",
    eyebrow: "Team invite",
    body: `Hi,

{{inviter_name}} has invited you to join {{team_name}} on Loopinglive as {{role}}.

This invitation expires in 7 days. If you were not expecting this, you can ignore it — nothing happens until you accept.`,
    meta: [
      { label: "Team", value: "{{team_name}}" },
      { label: "Role", value: "{{role}}" },
    ],
    cta: { label: "Accept invitation", url: "{{invite_link}}" },
  },
];

export const PLATFORM_TEMPLATE_BY_KEY = new Map(
  PLATFORM_TEMPLATES.map((template) => [template.key, template])
);

/**
 * Renders a platform email.
 *
 * Returns the plain-text alternative alongside the HTML — a transactional
 * email with no text part is markedly more likely to be filtered.
 */
export function renderPlatformEmail(
  key: string,
  variables: Record<string, string>,
  options: { brandName?: string; unsubscribeLink?: string } = {}
) {
  const template = PLATFORM_TEMPLATE_BY_KEY.get(key);
  if (!template) throw new Error(`Unknown platform email: ${key}`);

  const merged = { brand: options.brandName ?? "Loopinglive", ...variables };
  const fill = (value: string) => resolveTemplate(value, merged);

  const subject = fill(template.subject);
  const body = fill(template.body);

  // A transactional message never carries an unsubscribe link; a lifecycle one
  // always must, and refusing to render without it prevents a silent omission.
  const unsubscribeLink = template.transactional
    ? undefined
    : options.unsubscribeLink;

  const meta = (template.meta ?? [])
    .map((row) => ({ label: row.label, value: fill(row.value) }))
    // A row whose value did not resolve would render as an empty field.
    .filter((row) => row.value.trim().length > 0);

  const ctaUrl = template.cta ? fill(template.cta.url) : "";

  // These templates declare their CTA rather than having it inferred from the
  // copy, so the URL is stripped from the body directly. Several bodies quote
  // the link inline for the plain-text alternative, and without this it would
  // render as naked text directly above the button that already points there.
  const htmlBody = ctaUrl
    ? body
        .split("\n")
        .filter((line) => line.trim() !== ctaUrl)
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : body;

  const html = renderEmail({
    preheader: preheaderFor(htmlBody),
    eyebrow: template.eyebrow,
    heading: fill(template.heading ?? subject),
    body: htmlBody,
    meta,
    cta: ctaUrl ? { label: fill(template.cta!.label), url: ctaUrl } : null,
    unsubscribeLink,
    brandName: options.brandName,
    footerNote: template.transactional
      ? `This is a service message about your ${merged.brand} account.`
      : undefined,
  });

  // The text part keeps the URL, since there is no button to click in it.
  return { subject, html, text: body, template };
}

/** First real sentence, for the inbox preview line. */
function preheaderFor(body: string) {
  const prose = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block.length > 24 && !/^https?:\/\//.test(block));

  return (prose ?? body.trim()).replace(/\s+/g, " ").slice(0, 140);
}
