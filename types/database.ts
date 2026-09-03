// Hand-written to match supabase/migrations/0001_phase1_schema.sql.
// Regenerate once the schema settles:
//   npx supabase gen types typescript --project-id <id> > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Columns with a default or that are nullable are optional on insert. */
type Table<Row, Optional extends keyof Row> = {
  Row: Row;
  Insert: Omit<Row, Optional> & Partial<Pick<Row, Optional>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type WebinarStatus = "draft" | "published";

export type WebinarRow = {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  /** Null until a video is uploaded — a draft exists before its video does. */
  video_url: string | null;
  video_public_id: string | null;
  video_duration_seconds: number | null;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Phase 3
  topic: string | null;
  offer_description: string | null;
  webinar_context: string | null;
  key_talking_points: string | null;
  objection_notes: string | null;
  status: WebinarStatus;
  total_views: number;
  clone_of: string | null;
  // Phase 10 hardening — how the session is labelled to attendees.
  broadcast_label: string;
  show_recorded_notice: boolean;
};

export type WebinarOfferRow = {
  id: string;
  webinar_id: string;
  offer_title: string;
  offer_description: string | null;
  button_text: string;
  button_colour: string;
  button_animation: "pulse" | "glow" | "slide" | "bounce";
  trigger_video_offset_seconds: number;
  countdown_enabled: boolean;
  countdown_minutes: number;
  opens_in: "modal" | "new_tab";
  offer_type: "external" | "internal";
  external_url: string | null;
  internal_page_content: Json | null;
  price_cents: number;
  currency: string;
  is_active: boolean;
  created_at: string;
};

export type PurchaseRow = {
  id: string;
  webinar_id: string;
  session_id: string | null;
  registrant_id: string;
  offer_id: string | null;
  amount_cents: number;
  currency: string;
  source: "manual" | "internal" | "stripe";
  external_reference: string | null;
  created_at: string;
};

export type SessionSnapshotRow = {
  id: string;
  session_id: string;
  captured_at: string;
  video_offset_seconds: number;
  viewers: number;
  real_viewers: number;
  chat_messages: number;
};

export type WebinarDailyStatsRow = {
  id: string;
  webinar_id: string;
  day: string;
  registrations: number;
  attendees: number;
  no_shows: number;
  avg_watch_percentage: number;
  avg_watch_seconds: number;
  offer_clicks: number;
  purchases: number;
  revenue_cents: number;
  computed_at: string;
};

export type PlatformDailyStatsRow = {
  id: string;
  day: string;
  webinars_total: number;
  webinars_published: number;
  registrations: number;
  attendees: number;
  purchases: number;
  revenue_cents: number;
  emails_sent: number;
  sms_sent: number;
  whatsapp_sent: number;
  new_hosts: number;
  computed_at: string;
};

export type PollOption = { id: string; label: string };

export type TimedPollRow = {
  id: string;
  webinar_id: string;
  question: string;
  options: Json;
  video_offset_seconds: number;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
};

export type TimedHandoutRow = {
  id: string;
  webinar_id: string;
  title: string;
  file_url: string;
  video_offset_seconds: number;
  is_active: boolean;
  created_at: string;
};

export type TimedCtaRow = {
  id: string;
  webinar_id: string;
  button_text: string;
  button_url: string;
  button_colour: string;
  video_offset_seconds: number;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
};

export type TimedPinnedMessageRow = {
  id: string;
  webinar_id: string;
  content: string;
  video_offset_seconds: number;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
};

export type WebinarScheduleRow = {
  id: string;
  webinar_id: string;
  scheduled_at: string;
  timezone: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_time: string | null;
  is_active: boolean;
  created_at: string;
};

export type WebinarSessionRow = {
  id: string;
  webinar_id: string;
  schedule_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: "scheduled" | "live" | "ended";
  created_at: string;
  /** A run started by the host to look at their own work. Never counted. */
  is_test: boolean;
};

export type FakePersonaRow = {
  id: string;
  webinar_id: string;
  name: string;
  avatar_url: string | null;
  location: string | null;
  created_at: string;
};

export type TimedCommentRow = {
  id: string;
  webinar_id: string;
  persona_id: string;
  content: string;
  video_offset_seconds: number;
  created_at: string;
};

export type RegistrantRow = {
  id: string;
  webinar_id: string;
  session_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  country_code: string;
  country_flag: string;
  attended: boolean;
  joined_at: string | null;
  left_at: string | null;
  watch_seconds: number;
  watch_percentage: number;
  clicked_offer: boolean;
  bought: boolean;
  created_at: string;
  // Phase 4
  // Phase 6 — null on anyone who registered before capture was added.
  device_type: "mobile" | "tablet" | "desktop" | null;
  browser: string | null;
  os: string | null;
  /** Geo-IP. Not the same thing as country_code, which is a dialling code. */
  ip_country: string | null;
  watch_depth_segment: string;
  total_sessions_attended: number;
  last_attended_at: string | null;
  offer_clicked_at: string | null;
  bought_at: string | null;
  manually_marked_bought: boolean;
  returning_attendee: boolean;
  /** A registrant created by a host previewing their own webinar. */
  is_test: boolean;
  /**
   * The form this address shares with any other that reaches the same inbox.
   * For matching only — `email` is what they typed and what we write to.
   */
  email_canonical: string | null;
  history_cleared_at: string | null;
  notes: string | null;
  tags: Json;
};

export type CustomFieldType = "text" | "dropdown" | "checkbox" | "number";

export type CustomField = {
  id: string;
  type: CustomFieldType;
  label: string;
  required: boolean;
  options?: string[];
};

export type RegistrationPageConfigRow = {
  id: string;
  webinar_id: string;
  logo_url: string | null;
  hero_image_url: string | null;
  background_type: "solid" | "gradient" | "image" | "dark";
  background_value: string;
  primary_colour: string;
  secondary_colour: string;
  headline: string;
  subheadline: string | null;
  host_name: string | null;
  host_title: string | null;
  host_avatar_url: string | null;
  what_you_will_learn: Json;
  social_proof_count: number;
  social_proof_label: string;
  show_attendee_count: boolean;
  show_session_time: boolean;
  cta_button_text: string;
  thank_you_headline: string;
  thank_you_subheadline: string | null;
  thank_you_redirect_url: string | null;
  show_add_to_calendar: boolean;
  show_social_share: boolean;
  custom_fields: Json;
  facebook_pixel_id: string | null;
  fb_track_pageview: boolean;
  fb_track_lead: boolean;
  google_analytics_id: string | null;
  ga_track_conversion: boolean;
  custom_domain: string | null;
  custom_domain_status: "not_connected" | "pending" | "connected" | "failed";
  custom_css: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AttendeeSourceRow = {
  id: string;
  registrant_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer_url: string | null;
  landing_page_url: string | null;
  created_at: string;
};

export type AttendeeEventType =
  | "registered"
  | "joined_session"
  | "left_session"
  | "watch_milestone"
  | "clicked_offer"
  | "bought"
  | "rejoined"
  | "history_cleared"
  /** Took a scheduled handout. The strongest signal short of a purchase. */
  | "handout_downloaded"
  | "cta_clicked";

export type AttendeeEventRow = {
  id: string;
  registrant_id: string;
  session_id: string | null;
  event_type: AttendeeEventType;
  event_data: Json;
  created_at: string;
};

export type AttendeeSegmentRow = {
  id: string;
  webinar_id: string;
  registrant_id: string;
  segment: string;
  assigned_at: string;
  updated_at: string;
};

export type LiveChatMessageRow = {
  id: string;
  session_id: string;
  sender_name: string;
  sender_avatar: string | null;
  sender_location: string | null;
  is_fake: boolean;
  is_real_user: boolean;
  registrant_id: string | null;
  persona_id: string | null;
  timed_comment_id: string | null;
  content: string;
  sent_at: string;
  // Phase 2
  has_ai_reply: boolean;
  ai_reply_pending: boolean;
  ai_reply_claimed_at: string | null;
  reply_to_message_id: string | null;
};

export type PollResponseRow = {
  id: string;
  poll_id: string;
  session_id: string;
  registrant_id: string;
  option_id: string;
  created_at: string;
};

export type MessageChannel = "email" | "sms" | "whatsapp";

export type MessageStatus =
  | "pending"
  | "sent"
  | "failed"
  | "failed_permanently"
  | "cancelled";

export type MessageTemplateRow = {
  id: string;
  webinar_id: string;
  template_key: string;
  trigger_type: string;
  segment: string | null;
  channel: MessageChannel;
  subject: string | null;
  body: string;
  delay_hours: number;
  delay_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ScheduledMessageRow = {
  id: string;
  webinar_id: string;
  registrant_id: string;
  session_id: string | null;
  template_id: string | null;
  template_key: string | null;
  channel: MessageChannel;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  scheduled_for: string;
  sent_at: string | null;
  status: MessageStatus;
  attempts: number;
  error_message: string | null;
  provider_message_id: string | null;
  created_at: string;
};

export type MessageLogRow = {
  id: string;
  scheduled_message_id: string | null;
  registrant_id: string | null;
  channel: MessageChannel;
  status: string;
  provider_response: Json;
  sent_at: string;
};

export type ReplayAccessRow = {
  id: string;
  webinar_id: string;
  session_id: string;
  registrant_id: string;
  access_token: string;
  expires_at: string;
  first_accessed_at: string | null;
  last_accessed_at: string | null;
  watch_seconds: number;
  watch_percentage: number;
  is_active: boolean;
  created_at: string;
};

export type AutomationSettingsRow = {
  id: string;
  webinar_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  replay_enabled: boolean;
  replay_duration_hours: number;
  re_engagement_enabled: boolean;
  re_engagement_delay_days: number;
  re_engagement_frequency_days: number;
  max_re_engagement_messages: number;
  unsubscribe_enabled: boolean;
  from_name: string;
  from_email: string;
  reply_to_email: string | null;
  sms_sender_id: string | null;
  whatsapp_sender_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UnsubscribeRow = {
  id: string;
  registrant_id: string;
  webinar_id: string;
  channel: MessageChannel;
  unsubscribed_at: string;
};

export type AiPersonaRow = {
  id: string;
  webinar_id: string;
  persona_name: string;
  avatar_url: string | null;
  personality_brief: string;
  reply_to_real_users: boolean;
  fake_comment_reply_percentage: number;
  is_active: boolean;
  created_at: string;
};

export type AiReplyRow = {
  id: string;
  session_id: string;
  original_message_id: string;
  ai_persona_id: string | null;
  persona_name: string;
  persona_avatar: string | null;
  content: string;
  is_human_override: boolean;
  sent_at: string;
};

export type AdminSessionRow = {
  id: string;
  webinar_session_id: string;
  admin_id: string | null;
  joined_at: string;
  left_at: string | null;
};

export type PersonaModeRow = {
  id: string;
  session_id: string;
  ai_persona_id: string;
  mode: "ai" | "human";
  updated_at: string;
};

// ─────────────────────────── Phase 7 ───────────────────────────

export type PlanRow = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number | null;
  price_display: string;
  billing_period: string;
  stripe_price_id: string | null;
  features: Json;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type UserAccountRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country_code: string | null;
  timezone: string | null;
  plan_slug: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: string | null;
  plan_started_at: string | null;
  /** Null for lifetime, which never expires. */
  plan_expires_at: string | null;
  trial_ends_at: string | null;
  is_admin: boolean;
  /** owner | support | finance. Null on rows that predate roles. */
  admin_role: string | null;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  admin_note: string | null;
  referral_code: string;
  referred_by: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  user_id: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: string;
  plan_slug: string;
  billing_period: string;
  invoice_url: string | null;
  invoice_pdf_url: string | null;
  paid_at: string | null;
  created_at: string;
};

export type CouponRow = {
  id: string;
  code: string;
  stripe_coupon_id: string | null;
  discount_type: string;
  discount_value: number;
  applies_to: Json;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

export type AffiliateRow = {
  id: string;
  user_id: string;
  referral_code: string;
  commission_rate: number;
  total_referrals: number;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  is_active: boolean;
  payout_method: string | null;
  payout_details: Json;
  created_at: string;
};

export type AffiliateReferralRow = {
  id: string;
  affiliate_id: string;
  referred_user_id: string | null;
  invoice_id: string | null;
  commission_amount: number | null;
  status: string;
  confirms_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type FeatureFlagRow = {
  id: string;
  user_id: string;
  flag_name: string;
  is_enabled: boolean;
  created_at: string;
};

export type PlatformAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  /** Empty means everyone; otherwise the plan slugs that should see it. */
  target_plans: Json;
  created_by: string | null;
  created_at: string;
};

export type ImpersonationLogRow = {
  id: string;
  admin_id: string | null;
  impersonated_user_id: string | null;
  started_at: string;
  ended_at: string | null;
  reason: string | null;
};

// ─────────────────────────── Phase 8 ───────────────────────────

export type IntegrationRow = {
  id: string;
  user_id: string | null;
  provider: string;
  status: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  api_key: string | null;
  account_name: string | null;
  account_id: string | null;
  settings: Json;
  last_error: string | null;
  connected_at: string;
  last_synced_at: string | null;
};

export type WebhookEndpointRow = {
  id: string;
  user_id: string | null;
  webinar_id: string | null;
  url: string;
  description: string | null;
  secret: string;
  events: Json;
  is_active: boolean;
  created_at: string;
};

export type WebhookLogRow = {
  id: string;
  webhook_endpoint_id: string;
  event_type: string;
  payload: Json;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  attempt_count: number;
  status: string;
  next_retry_at: string | null;
  sent_at: string | null;
  created_at: string;
};

export type ApiKeyRow = {
  id: string;
  user_id: string | null;
  name: string;
  key_hash: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type OnboardingProgressRow = {
  id: string;
  user_id: string;
  steps_completed: Json;
  current_step: string;
  completed_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

export type ErrorLogRow = {
  id: string;
  user_id: string | null;
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  page_url: string | null;
  user_agent: string | null;
  metadata: Json;
  created_at: string;
};

export type AdminActionRow = {
  id: string;
  admin_id: string | null;
  target_user_id: string | null;
  action: string;
  detail: Json;
  created_at: string;
};

// ─────────────────────────── Phase 10 ───────────────────────────

export type LiveSessionStatus =
  | "backstage"
  | "live"
  | "ended"
  | "processing"
  | "converted"
  | "failed";

export type LiveSessionRow = {
  id: string;
  webinar_id: string | null;
  session_id: string | null;
  host_id: string | null;
  room_name: string;
  status: LiveSessionStatus;
  title: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  peak_viewers: number;
  egress_id: string | null;
  recording_url: string | null;
  recording_public_id: string | null;
  recording_error: string | null;
  converted_webinar_id: string | null;
  converted_at: string | null;
  created_at: string;
};

export type LiveSegmentRow = {
  id: string;
  live_session_id: string;
  /** camera | screen | recorded_clip */
  kind: string;
  source_url: string | null;
  label: string | null;
  started_at: string;
  ended_at: string | null;
  offset_seconds: number;
};

export type LiveQuestionRow = {
  id: string;
  live_session_id: string;
  session_id: string | null;
  registrant_id: string | null;
  author_name: string;
  question: string;
  status: string;
  is_featured: boolean;
  upvotes: number;
  answered_at: string | null;
  video_offset_seconds: number | null;
  created_at: string;
};

export type LiveQuestionVoteRow = {
  question_id: string;
  registrant_id: string;
  created_at: string;
};

export type HandoutDownloadRow = {
  id: string;
  handout_id: string;
  registrant_id: string;
  session_id: string | null;
  video_offset_seconds: number | null;
  created_at: string;
};

export type OfferVariantRow = {
  id: string;
  webinar_id: string | null;
  offer_id: string | null;
  name: string;
  /** Null means inherit from the base offer. */
  offer_title: string | null;
  button_text: string | null;
  price_cents: number | null;
  trigger_video_offset_seconds: number | null;
  weight: number;
  is_control: boolean;
  is_active: boolean;
  created_at: string;
};

export type OfferAssignmentRow = {
  registrant_id: string;
  webinar_id: string;
  variant_id: string;
  assigned_at: string;
};

export type SavedSegmentRow = {
  id: string;
  name: string;
  description: string | null;
  filters: Json;
  created_by: string | null;
  created_at: string;
};

export type BroadcastRow = {
  id: string;
  segment_id: string | null;
  filters: Json;
  subject: string;
  body: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type SavedFilterRow = {
  id: string;
  owner_id: string | null;
  name: string;
  query: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      saved_filters: Table<SavedFilterRow, "id" | "owner_id" | "created_at">;
      saved_segments: Table<
        SavedSegmentRow,
        "id" | "description" | "filters" | "created_by" | "created_at"
      >;
      broadcasts: Table<
        BroadcastRow,
        | "id"
        | "segment_id"
        | "filters"
        | "status"
        | "recipient_count"
        | "sent_count"
        | "failed_count"
        | "sent_at"
        | "created_by"
        | "created_at"
      >;
      offer_variants: Table<
        OfferVariantRow,
        Exclude<keyof OfferVariantRow, "name">
      >;
      offer_assignments: Table<OfferAssignmentRow, "assigned_at">;
      handout_downloads: Table<
        HandoutDownloadRow,
        "id" | "session_id" | "video_offset_seconds" | "created_at"
      >;
      live_sessions: Table<
        LiveSessionRow,
        Exclude<keyof LiveSessionRow, "room_name">
      >;
      live_segments: Table<
        LiveSegmentRow,
        "id" | "source_url" | "label" | "started_at" | "ended_at" | "offset_seconds"
      >;
      live_questions: Table<
        LiveQuestionRow,
        | "id"
        | "session_id"
        | "registrant_id"
        | "status"
        | "is_featured"
        | "upvotes"
        | "answered_at"
        | "video_offset_seconds"
        | "created_at"
      >;
      live_question_votes: Table<LiveQuestionVoteRow, "created_at">;
      admin_actions: Table<
        AdminActionRow,
        "id" | "admin_id" | "target_user_id" | "detail" | "created_at"
      >;
      integrations: Table<
        IntegrationRow,
        Exclude<keyof IntegrationRow, "provider">
      >;
      webhook_endpoints: Table<
        WebhookEndpointRow,
        Exclude<keyof WebhookEndpointRow, "url">
      >;
      webhook_logs: Table<
        WebhookLogRow,
        | "id"
        | "response_status"
        | "response_body"
        | "error_message"
        | "attempt_count"
        | "status"
        | "next_retry_at"
        | "sent_at"
        | "created_at"
      >;
      api_keys: Table<
        ApiKeyRow,
        "id" | "user_id" | "last_used_at" | "expires_at" | "is_active" | "created_at"
      >;
      onboarding_progress: Table<
        OnboardingProgressRow,
        Exclude<keyof OnboardingProgressRow, "user_id">
      >;
      error_logs: Table<
        ErrorLogRow,
        | "id"
        | "user_id"
        | "stack_trace"
        | "page_url"
        | "user_agent"
        | "metadata"
        | "created_at"
      >;
      plans: Table<
        PlanRow,
        | "id"
        | "price_monthly"
        | "stripe_price_id"
        | "features"
        | "sort_order"
        | "is_active"
        | "created_at"
      >;
      user_accounts: Table<
        UserAccountRow,
        Exclude<keyof UserAccountRow, "id" | "email">
      >;
      invoices: Table<
        InvoiceRow,
        | "id"
        | "user_id"
        | "stripe_invoice_id"
        | "stripe_payment_intent_id"
        | "currency"
        | "invoice_url"
        | "invoice_pdf_url"
        | "paid_at"
        | "created_at"
      >;
      coupons: Table<
        CouponRow,
        | "id"
        | "stripe_coupon_id"
        | "applies_to"
        | "max_uses"
        | "uses_count"
        | "expires_at"
        | "is_active"
        | "created_by"
        | "created_at"
      >;
      affiliates: Table<
        AffiliateRow,
        | "id"
        | "commission_rate"
        | "total_referrals"
        | "total_earnings"
        | "pending_earnings"
        | "paid_earnings"
        | "is_active"
        | "payout_method"
        | "payout_details"
        | "created_at"
      >;
      affiliate_referrals: Table<
        AffiliateReferralRow,
        | "id"
        | "referred_user_id"
        | "invoice_id"
        | "commission_amount"
        | "status"
        | "confirms_at"
        | "paid_at"
        | "created_at"
      >;
      feature_flags: Table<FeatureFlagRow, "id" | "is_enabled" | "created_at">;
      platform_announcements: Table<
        PlatformAnnouncementRow,
        | "id"
        | "type"
        | "is_active"
        | "starts_at"
        | "ends_at"
        | "target_plans"
        | "created_by"
        | "created_at"
      >;
      impersonation_logs: Table<
        ImpersonationLogRow,
        "id" | "admin_id" | "impersonated_user_id" | "started_at" | "ended_at" | "reason"
      >;
      webinars: Table<
        WebinarRow,
        | "id"
        | "owner_id"
        | "description"
        | "video_url"
        | "video_public_id"
        | "video_duration_seconds"
        | "thumbnail_url"
        | "is_active"
        | "created_at"
        | "updated_at"
        | "topic"
        | "offer_description"
        | "webinar_context"
        | "key_talking_points"
        | "objection_notes"
        | "status"
        | "total_views"
        | "clone_of"
        | "broadcast_label"
        | "show_recorded_notice"
      >;
      webinar_schedules: Table<
        WebinarScheduleRow,
        | "id"
        | "timezone"
        | "is_recurring"
        | "recurrence_pattern"
        | "recurrence_time"
        | "is_active"
        | "created_at"
      >;
      webinar_sessions: Table<
        WebinarSessionRow,
        "id" | "schedule_id" | "ends_at" | "status" | "created_at" | "is_test"
      >;
      fake_personas: Table<
        FakePersonaRow,
        "id" | "avatar_url" | "location" | "created_at"
      >;
      timed_comments: Table<TimedCommentRow, "id" | "created_at">;
      registrants: Table<
        RegistrantRow,
        | "id"
        | "session_id"
        | "attended"
        | "joined_at"
        | "left_at"
        | "watch_seconds"
        | "watch_percentage"
        | "clicked_offer"
        | "bought"
        | "created_at"
        | "watch_depth_segment"
        | "total_sessions_attended"
        | "last_attended_at"
        | "offer_clicked_at"
        | "bought_at"
        | "manually_marked_bought"
        | "returning_attendee"
        | "is_test"
        | "email_canonical"
        | "history_cleared_at"
        | "notes"
        | "tags"
        | "device_type"
        | "browser"
        | "os"
        | "ip_country"
      >;
      purchases: Table<
        PurchaseRow,
        | "id"
        | "session_id"
        | "offer_id"
        | "amount_cents"
        | "currency"
        | "source"
        | "external_reference"
        | "created_at"
      >;
      session_snapshots: Table<
        SessionSnapshotRow,
        "id" | "captured_at" | "viewers" | "real_viewers" | "chat_messages"
      >;
      webinar_daily_stats: Table<
        WebinarDailyStatsRow,
        Exclude<keyof WebinarDailyStatsRow, "webinar_id" | "day">
      >;
      platform_daily_stats: Table<
        PlatformDailyStatsRow,
        Exclude<keyof PlatformDailyStatsRow, "day">
      >;
      registration_page_config: Table<
        RegistrationPageConfigRow,
        Exclude<keyof RegistrationPageConfigRow, "webinar_id">
      >;
      attendee_sources: Table<
        AttendeeSourceRow,
        Exclude<keyof AttendeeSourceRow, "registrant_id">
      >;
      attendee_events: Table<
        AttendeeEventRow,
        "id" | "session_id" | "event_data" | "created_at"
      >;
      attendee_segments: Table<
        AttendeeSegmentRow,
        "id" | "assigned_at" | "updated_at"
      >;
      live_chat_messages: Table<
        LiveChatMessageRow,
        | "id"
        | "sender_avatar"
        | "sender_location"
        | "is_fake"
        | "is_real_user"
        | "registrant_id"
        | "persona_id"
        | "timed_comment_id"
        | "sent_at"
        | "has_ai_reply"
        | "ai_reply_pending"
        | "ai_reply_claimed_at"
        | "reply_to_message_id"
      >;
      webinar_offers: Table<
        WebinarOfferRow,
        | "id"
        | "offer_description"
        | "button_text"
        | "button_colour"
        | "button_animation"
        | "countdown_enabled"
        | "countdown_minutes"
        | "opens_in"
        | "external_url"
        | "internal_page_content"
        | "price_cents"
        | "currency"
        | "is_active"
        | "created_at"
      >;
      timed_polls: Table<
        TimedPollRow,
        "id" | "duration_seconds" | "is_active" | "created_at"
      >;
      timed_handouts: Table<TimedHandoutRow, "id" | "is_active" | "created_at">;
      timed_ctas: Table<
        TimedCtaRow,
        "id" | "button_colour" | "duration_seconds" | "is_active" | "created_at"
      >;
      timed_pinned_messages: Table<
        TimedPinnedMessageRow,
        "id" | "duration_seconds" | "is_active" | "created_at"
      >;
      poll_responses: Table<PollResponseRow, "id" | "created_at">;
      message_templates: Table<
        MessageTemplateRow,
        | "id"
        | "segment"
        | "subject"
        | "delay_hours"
        | "delay_unit"
        | "is_active"
        | "created_at"
        | "updated_at"
      >;
      scheduled_messages: Table<
        ScheduledMessageRow,
        | "id"
        | "session_id"
        | "template_id"
        | "template_key"
        | "recipient_email"
        | "recipient_phone"
        | "recipient_name"
        | "subject"
        | "sent_at"
        | "status"
        | "attempts"
        | "error_message"
        | "provider_message_id"
        | "created_at"
      >;
      message_logs: Table<
        MessageLogRow,
        "id" | "scheduled_message_id" | "registrant_id" | "provider_response" | "sent_at"
      >;
      replay_access: Table<
        ReplayAccessRow,
        | "id"
        | "access_token"
        | "first_accessed_at"
        | "last_accessed_at"
        | "watch_seconds"
        | "watch_percentage"
        | "is_active"
        | "created_at"
      >;
      automation_settings: Table<
        AutomationSettingsRow,
        Exclude<keyof AutomationSettingsRow, "webinar_id">
      >;
      unsubscribes: Table<UnsubscribeRow, "id" | "unsubscribed_at">;
      ai_personas: Table<
        AiPersonaRow,
        | "id"
        | "avatar_url"
        | "reply_to_real_users"
        | "fake_comment_reply_percentage"
        | "is_active"
        | "created_at"
      >;
      ai_replies: Table<
        AiReplyRow,
        "id" | "ai_persona_id" | "persona_avatar" | "is_human_override" | "sent_at"
      >;
      admin_sessions: Table<
        AdminSessionRow,
        "id" | "admin_id" | "joined_at" | "left_at"
      >;
      persona_mode: Table<PersonaModeRow, "id" | "mode" | "updated_at">;
    };
    Views: Record<string, never>;
    Functions: {
      /** Where the attended flag and the event log disagree. */
      attendance_mismatches: {
        Args: { p_webinar_id: string };
        Returns: {
          registrant_id: string;
          full_name: string;
          email: string;
          attended: boolean;
          join_events: number;
          problem: string;
        }[];
      };
      /** Makes them agree. Returns what it changed. */
      reconcile_attendance: {
        Args: { p_webinar_id: string };
        Returns: Json;
      };
      /** Registrants of one webinar that resolve to the same inbox. */
      duplicate_registrants: {
        Args: { p_webinar_id: string };
        Returns: { email_canonical: string; copies: number; ids: string[] }[];
      };
      /** Clears away test runs older than a day. Returns rows removed. */
      purge_test_sessions: {
        Args: Record<string, never>;
        Returns: number;
      };
      /** Aggregated poll answers, so a big room does not ship every row. */
      poll_results: {
        Args: { p_poll_id: string };
        Returns: { option_id: string; votes: number; share: number }[];
      };
      /** Turns a segment's filters into the accounts they match. */
      resolve_segment: {
        Args: { p_filters: Json };
        Returns: {
          user_id: string;
          email: string;
          full_name: string;
          plan_slug: string;
        }[];
      };
      /** Per-variant results for an offer experiment. */
      offer_experiment_results: {
        Args: { p_webinar_id: string };
        Returns: {
          variant_id: string;
          name: string;
          is_control: boolean;
          assigned: number;
          clicked: number;
          bought: number;
          revenue_cents: number;
          conversion: number;
        }[];
      };
      /** Marks upcoming sessions whose video should be verified. */
      tick_preflight: {
        Args: Record<string, never>;
        Returns: number;
      };
      /** Cron job health, reaching into the cron schema on the app's behalf. */
      admin_cron_health: {
        Args: Record<string, never>;
        Returns: {
          jobname: string;
          schedule: string;
          active: boolean;
          last_run: string | null;
          last_status: string | null;
          last_duration_ms: number | null;
          failures_24h: number;
          runs_24h: number;
        }[];
      };
      /** Paid retention by signup cohort. */
      admin_cohort_retention: {
        Args: { p_months?: number };
        Returns: {
          cohort: string;
          cohort_size: number;
          month_offset: number;
          retained: number;
        }[];
      };
      /** Creates the next session for a webinar if none is pending. */
      ensure_upcoming_session: {
        Args: { p_webinar_id: string };
        Returns: string | null;
      };
      /** The scheduled job: statuses, retired schedules, next sessions. */
      roll_sessions_forward: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
