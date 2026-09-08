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
  // Phase 12 — team ownership and the script it was built from, if any.
  team_id: string | null;
  script_id: string | null;
  // Phase 11 — advanced features, all optional/off by default.
  series_id: string | null;
  on_demand_enabled: boolean;
  on_demand_expires_hours: number;
  on_demand_allow_seek: boolean;
  certificate_enabled: boolean;
  certificate_min_watch_percentage: number;
  certificate_template_id: string | null;
  exit_survey_enabled: boolean;
  private_messaging_enabled: boolean;
  raise_hand_enabled: boolean;
  primary_language: string;
  supported_languages: string[];
  mode: "scheduled" | "on_demand" | "both";
  host_name: string | null;
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

/**
 * A companion offer at checkout, taken or not with one click.
 *
 * One per offer, not a list — a checkout with three add-ons stops reading as
 * a decision already made and starts reading as one to reconsider.
 */
export type WebinarOfferBumpRow = {
  id: string;
  offer_id: string;
  title: string;
  description: string | null;
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
  /** Set when this purchase included the offer's bump. */
  bump_id: string | null;
  /** How much of amount_cents was the bump, so attach rate is computable. */
  bump_amount_cents: number | null;
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

export type AiGeneratedPersonasRow = {
  id: string;
  webinar_id: string;
  generation_prompt: string | null;
  generated_count: number;
  niche: string | null;
  locations: string[];
  status: string;
  completed_at: string | null;
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

export type CeleBioConnectionRow = {
  id: string;
  user_id: string;
  cele_bio_user_id: string;
  cele_bio_username: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  auto_sync_enabled: boolean;
  show_on_profile: boolean;
  use_cele_bio_payments: boolean;
  connected_at: string;
  last_synced_at: string | null;
};

export type CeleBioSyncedWebinarRow = {
  id: string;
  connection_id: string;
  webinar_id: string;
  cele_bio_product_id: string | null;
  synced_at: string;
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
  // Phase 11 — upsell automation and Cele.bio sync.
  upsell_eligible: boolean;
  upsell_eligible_at: string | null;
  upsell_sent_at: string | null;
  upsell_webinar_id: string | null;
  upsell_source_webinar_id: string | null;
  /** When the target webinar's offer was actually bought -- not set by anything yet, see lib/webinar-completion.ts. */
  upsell_bought_at: string | null;
  cele_bio_synced: boolean;
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
  /** Clicked a timed CTA. Handouts live in handout_downloads, not here. */
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

/**
 * Platform settings that must be changeable without a deploy.
 *
 * Service-role only: it also holds the cron secret. Anything that needs
 * reading with a weaker key goes through a security-definer function that
 * exposes just that value.
 */
/*
 * Phase 13: attendee scoring, A/B testing, personalisation, growth
 * intelligence. Only the tables with application code built against them are
 * typed here so far — the rest exist in the database (migration 0036) and
 * get their types added when their feature is built.
 */

export type AttendeeScoreRow = {
  id: string;
  registrant_id: string;
  webinar_id: string;
  engagement_score: number;
  conversion_likelihood: number;
  churn_risk: number;
  lifetime_value_estimate: number;
  score_factors: Json;
  scored_at: string;
  updated_at: string;
};

export type ConversionPredictionRow = {
  id: string;
  registrant_id: string;
  webinar_id: string;
  prediction_score: number;
  prediction_factors: Json;
  predicted_at: string;
  outcome: string | null;
  outcome_recorded_at: string | null;
};

export type AbTestRow = {
  id: string;
  webinar_id: string;
  name: string;
  description: string | null;
  test_type: string;
  variant_a: Json;
  variant_b: Json;
  traffic_split: number;
  status: "draft" | "running" | "paused" | "completed";
  winner: string | null;
  confidence_level: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type AbTestAssignmentRow = {
  id: string;
  ab_test_id: string;
  registrant_id: string;
  variant: "a" | "b";
  assigned_at: string;
  converted: boolean;
  converted_at: string | null;
};

export type AbTestResultRow = {
  id: string;
  ab_test_id: string;
  variant: "a" | "b";
  impressions: number;
  conversions: number;
  conversion_rate: number;
  statistical_significance: number;
  calculated_at: string;
};

export type AdCreativeRow = {
  id: string;
  webinar_id: string;
  user_id: string | null;
  platform: string;
  format: string;
  headline: string;
  primary_text: string;
  description: string | null;
  call_to_action: string;
  image_url: string | null;
  video_url: string | null;
  generated_by_ai: boolean;
  performance_score: number | null;
  status: "draft" | "approved" | "archived";
  created_at: string;
};

export type PersonalisationRuleRow = {
  id: string;
  webinar_id: string;
  rule_name: string;
  conditions: Json;
  actions: Json;
  priority: number;
  is_active: boolean;
  created_at: string;
};

export type PersonalisationEventRow = {
  id: string;
  registrant_id: string;
  session_id: string | null;
  rule_id: string | null;
  event_type: string;
  data: Json;
  created_at: string;
};

export type SupportConversationRow = {
  id: string;
  session_id: string | null;
  registrant_id: string;
  status: "open" | "resolved" | "escalated";
  channel: string;
  messages: Json;
  resolved_at: string | null;
  satisfaction_rating: number | null;
  created_at: string;
  updated_at: string;
};

export type ScheduleOptimisationRow = {
  id: string;
  webinar_id: string;
  recommended_times: Json;
  analysis_data: Json;
  based_on_sessions: number;
  confidence_score: number | null;
  applied: boolean;
  created_at: string;
};

export type RevenueForecastRow = {
  id: string;
  user_id: string;
  webinar_id: string | null;
  forecast_period: string;
  forecast_type: string;
  predicted_registrants: number | null;
  predicted_attendees: number | null;
  predicted_conversions: number | null;
  predicted_revenue: number | null;
  confidence_interval_low: number | null;
  confidence_interval_high: number | null;
  actual_revenue: number | null;
  accuracy_percentage: number | null;
  model_version: string | null;
  created_at: string;
};

export type AiInsightRow = {
  id: string;
  user_id: string | null;
  webinar_id: string | null;
  insight_type: string;
  title: string;
  body: string;
  action_items: Json;
  priority: "low" | "medium" | "high";
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
};

export type SmartSegmentRow = {
  id: string;
  webinar_id: string;
  name: string;
  description: string | null;
  conditions: Json;
  registrant_count: number;
  last_evaluated_at: string | null;
  is_dynamic: boolean;
  created_at: string;
};

export type CompetitorIntelligenceRow = {
  id: string;
  user_id: string;
  competitor_name: string;
  competitor_url: string | null;
  data_points: Json;
  last_analysed_at: string | null;
  created_at: string;
};

export type PlatformHealthMetricRow = {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  threshold_warning: number | null;
  threshold_critical: number | null;
  status: "healthy" | "warning" | "critical";
  metadata: Json;
  recorded_at: string;
};

/*
 * Phase 11: white label, series, on-demand, certificates, exit surveys,
 * private messaging, raise hand, AI persona generation, multi-language,
 * upsell automation, Cele.bio integration.
 */

export type WhiteLabelConfigRow = {
  id: string;
  user_id: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_favicon_url: string | null;
  primary_colour: string;
  secondary_colour: string;
  background_colour: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  hide_loopinglive_branding: boolean;
  custom_login_page_headline: string | null;
  custom_login_page_subheadline: string | null;
  custom_support_email: string | null;
  custom_terms_url: string | null;
  custom_privacy_url: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  /** Encrypted at rest by the application before this column is ever written — never a plaintext credential. */
  smtp_password_encrypted: string | null;
  use_custom_smtp: boolean;
  created_at: string;
  updated_at: string;
};

export type WebinarSeriesRow = {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_sequential: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WebinarSeriesItemRow = {
  id: string;
  series_id: string;
  webinar_id: string;
  position: number;
  unlock_after_days: number;
  unlock_after_completion: boolean;
  /** Finer-grained than unlock_after_days -- what the series builder actually schedules against. */
  unlock_delay_hours: number;
  created_at: string;
};

export type SeriesProgressRow = {
  id: string;
  series_id: string;
  registrant_email: string;
  current_webinar_id: string | null;
  completed_webinar_ids: Json;
  started_at: string;
  last_activity_at: string;
};

export type OnDemandAccessRow = {
  id: string;
  webinar_id: string;
  registrant_id: string;
  access_token: string;
  expires_at: string | null;
  first_accessed_at: string | null;
  last_accessed_at: string | null;
  watch_seconds: number;
  watch_percentage: number;
  is_active: boolean;
  created_at: string;
};

export type CertificateTemplateRow = {
  id: string;
  user_id: string | null;
  name: string;
  design: Json;
  is_default: boolean;
  created_at: string;
};

export type CertificateRow = {
  id: string;
  webinar_id: string;
  registrant_id: string;
  certificate_number: string;
  issued_at: string;
  download_url: string | null;
  template_id: string;
};

export type ExitSurveyRow = {
  id: string;
  webinar_id: string;
  title: string;
  questions: Json;
  is_active: boolean;
  created_at: string;
};

export type ExitSurveyResponseRow = {
  id: string;
  webinar_id: string;
  registrant_id: string;
  session_id: string | null;
  responses: Json;
  submitted_at: string;
};

export type PrivateMessageRow = {
  id: string;
  session_id: string;
  registrant_id: string;
  sender_type: "attendee" | "host";
  content: string;
  is_read: boolean;
  read_at: string | null;
  sent_at: string;
};

export type RaisedHandRow = {
  id: string;
  session_id: string;
  registrant_id: string;
  raised_at: string;
  lowered_at: string | null;
  acknowledged_at: string | null;
};

export type AiGeneratedPersonaRow = {
  id: string;
  webinar_id: string;
  generation_prompt: string | null;
  generated_count: number;
  niche: string | null;
  locations: Json;
  status: "pending" | "generating" | "completed" | "failed";
  completed_at: string | null;
  created_at: string;
};

export type UpsellSequenceRow = {
  id: string;
  owner_id: string | null;
  source_webinar_id: string;
  target_webinar_id: string;
  delay_days: number;
  is_active: boolean;
  email_subject: string | null;
  email_body: string | null;
  sms_body: string | null;
  whatsapp_body: string | null;
  created_at: string;
};

export type WebinarTranslationRow = {
  id: string;
  webinar_id: string;
  language_code: string;
  title: string | null;
  description: string | null;
  registration_headline: string | null;
  registration_subheadline: string | null;
  what_you_will_learn: Json;
  cta_button_text: string | null;
  auto_translated: boolean;
  created_at: string;
  updated_at: string;
};

/*
 * Phase 12: teams, marketplace, academy, script writer, enterprise.
 *
 * blockchain_certificates is deliberately not here — it references a
 * `certificates` table that does not exist in this database, despite being
 * listed as already built. Nothing to point at yet.
 */

export type TeamRow = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  plan_slug: string;
  max_members: number;
  max_webinars: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamMemberRow = {
  id: string;
  team_id: string;
  user_id: string;
  /** "owner" | "admin" | "editor" | "viewer" */
  role: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  /** "pending" | "active" */
  status: string;
  permissions: Json;
};

export type TeamInvitationRow = {
  id: string;
  team_id: string;
  invited_email: string;
  role: string;
  invited_by: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type MarketplaceSellerProfileRow = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  total_sales: number;
  total_earnings: number;
  average_rating: number;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarded: boolean;
  payout_enabled: boolean;
  created_at: string;
};

export type MarketplaceListingRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category: string;
  listing_type: string;
  price: number;
  currency: string;
  preview_url: string | null;
  thumbnail_url: string | null;
  demo_url: string | null;
  tags: Json;
  included_items: Json;
  total_sales: number;
  average_rating: number;
  review_count: number;
  is_featured: boolean;
  is_approved: boolean;
  is_active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketplacePurchaseRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string | null;
  amount_paid: number;
  stripe_payment_intent_id: string | null;
  platform_fee: number;
  seller_earnings: number;
  status: string;
  purchased_at: string;
};

export type MarketplaceReviewRow = {
  id: string;
  listing_id: string;
  reviewer_id: string;
  purchase_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  created_at: string;
};

export type AcademyCourseRow = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  estimated_minutes: number;
  is_free: boolean;
  is_published: boolean;
  position: number;
  created_at: string;
};

export type AcademyLessonRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  position: number;
  is_preview: boolean;
  created_at: string;
};

export type AcademyProgressRow = {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string | null;
  completed_lesson_ids: Json;
  completed_at: string | null;
};

export type WebinarScriptRow = {
  id: string;
  user_id: string;
  webinar_id: string | null;
  title: string;
  topic: string;
  target_audience: string | null;
  offer_description: string | null;
  webinar_length_minutes: number;
  script_content: Json;
  status: string;
  created_at: string;
  updated_at: string;
};

/** A "Request a Demo" submission, before it is anything more than a conversation. */
export type EnterpriseLeadRow = {
  id: string;
  company_name: string;
  full_name: string;
  work_email: string;
  phone: string | null;
  team_size: string | null;
  monthly_sessions: string | null;
  current_platform: string | null;
  message: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
};

export type EnterpriseAccountRow = {
  id: string;
  team_id: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  custom_price_monthly: number | null;
  custom_max_members: number | null;
  custom_max_webinars: number | null;
  custom_max_attendees_per_session: number | null;
  dedicated_support_email: string | null;
  sla_response_hours: number;
  custom_onboarding: boolean;
  white_label_included: boolean;
  api_rate_limit_per_minute: number;
  notes: string | null;
  account_manager_id: string | null;
  created_at: string;
};

export type PushNotificationSubscriptionRow = {
  id: string;
  user_id: string | null;
  registrant_id: string | null;
  device_token: string;
  platform: string;
  app_version: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GraphqlQueryLogRow = {
  id: string;
  api_key_id: string | null;
  operation_name: string | null;
  query_hash: string | null;
  variables: Json | null;
  response_time_ms: number | null;
  status: string | null;
  created_at: string;
};

/**
 * Someone in a room telling us something is wrong.
 *
 * The platform had no way to hear about a problem before this: anyone can
 * upload a video and put it in front of an audience they bring themselves.
 */
export type ContentReportRow = {
  id: string;
  webinar_id: string;
  session_id: string | null;
  /** Null when reported by someone who never registered. */
  registrant_id: string | null;
  reason: string;
  detail: string | null;
  /** Truncated sha256 of the reporter's IP. Cleared after 30 days. */
  reporter_fingerprint: string | null;
  status: "open" | "actioned" | "dismissed";
  resolution: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

/** One CIDR block allowed to reach the super admin console. */
/** A chargeback against a purchase. Stripe's dispute, mirrored locally. */
export type DisputeRow = {
  id: string;
  purchase_id: string | null;
  stripe_dispute_id: string;
  stripe_charge_id: string | null;
  amount_cents: number;
  currency: string;
  reason: string | null;
  status: string;
  webinar_id: string | null;
  owner_id: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type AdminIpAllowlistRow = {
  id: string;
  cidr: string;
  label: string;
  created_by: string | null;
  created_at: string;
};

export type AppConfigRow = {
  key: string;
  value: string;
  updated_at: string;
};

export type UnsubscribeRow = {
  id: string;
  /** Null once the person has been erased; the hash below carries the record. */
  registrant_id: string | null;
  webinar_id: string;
  channel: MessageChannel;
  unsubscribed_at: string;
  /**
   * sha256 of the lowercased address, written on erasure.
   *
   * A suppression has to outlive the person, or the next list import mails
   * someone who asked not to be contacted.
   */
  email_hash: string | null;
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
  /** TOTP. Only set on admin accounts; see migration 0030. */
  totp_secret: string | null;
  totp_enabled_at: string | null;
  /** sha256 of each recovery code. Never the codes themselves. */
  totp_recovery_hashes: string[] | null;
  /** The last accepted 30-second step, so a code cannot be replayed. */
  totp_last_step: number | null;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  admin_note: string | null;
  referral_code: string;
  referred_by: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  // Phase 12.
  team_id: string | null;
  team_role: string | null;
  enterprise_account_id: string | null;
  mobile_app_registered: boolean;
  last_mobile_app_login: string | null;
  is_marketplace_seller: boolean;
  marketplace_seller_id: string | null;
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

// ─── Phase 14: global expansion, accessibility, security, plugins, streaming,
// creator economy, advanced video, documentation. Matches
// supabase/migrations/0043_phase14_foundation.sql.

export type LocalizedPricingRow = {
  id: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  monthly_price: number;
  yearly_price: number;
  lifetime_price: number;
  purchasing_power_parity_factor: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  stripe_price_id_lifetime: string | null;
  payment_methods: Json;
  is_active: boolean;
  created_at: string;
};

export type LocalPaymentMethodRow = {
  id: string;
  method_name: string;
  method_type: string;
  supported_countries: Json;
  provider: string;
  provider_config: Json;
  is_active: boolean;
  created_at: string;
};

export type AccessibilityPreferencesRow = {
  id: string;
  user_id: string | null;
  reduce_motion: boolean;
  high_contrast: boolean;
  large_text: boolean;
  screen_reader_optimised: boolean;
  captions_enabled: boolean;
  caption_size: string;
  caption_background: boolean;
  keyboard_navigation_hints: boolean;
  created_at: string;
  updated_at: string;
};

export type SsoConfigurationRow = {
  id: string;
  team_id: string | null;
  provider: string;
  entity_id: string | null;
  sso_url: string;
  certificate: string;
  attribute_mapping: Json;
  is_active: boolean;
  require_sso: boolean;
  created_at: string;
  updated_at: string;
};

export type SsoSessionRow = {
  id: string;
  team_id: string | null;
  user_id: string | null;
  session_token: string;
  provider: string;
  provider_session_id: string | null;
  expires_at: string;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  team_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: Json | null;
  new_value: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
};

export type Soc2EvidenceRow = {
  id: string;
  control_id: string;
  control_name: string;
  evidence_type: string;
  evidence_data: Json;
  collected_at: string;
  review_period_start: string | null;
  review_period_end: string | null;
};

export type DataExportRequestRow = {
  id: string;
  user_id: string | null;
  request_type: string;
  status: string;
  export_url: string | null;
  expires_at: string | null;
  requested_at: string;
  completed_at: string | null;
};

export type GdprRequestRow = {
  id: string;
  requester_email: string;
  request_type: string;
  webinar_id: string | null;
  status: string;
  processed_by: string | null;
  processed_at: string | null;
  notes: string | null;
  created_at: string;
};

export type PluginRow = {
  id: string;
  developer_id: string | null;
  name: string;
  slug: string;
  description: string;
  version: string;
  category: string;
  manifest: Json;
  bundle_url: string;
  icon_url: string | null;
  screenshots: Json;
  pricing_type: string;
  price: number;
  install_count: number;
  average_rating: number;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PluginInstallationRow = {
  id: string;
  plugin_id: string | null;
  user_id: string | null;
  webinar_id: string | null;
  settings: Json;
  is_active: boolean;
  installed_at: string;
};

export type PluginEventRow = {
  id: string;
  plugin_id: string | null;
  installation_id: string | null;
  event_type: string;
  payload: Json;
  response: Json | null;
  status: string;
  created_at: string;
};

export type MultiStreamDestinationRow = {
  id: string;
  webinar_id: string | null;
  user_id: string | null;
  platform: string;
  stream_key: string;
  rtmp_url: string;
  is_active: boolean;
  last_streamed_at: string | null;
  created_at: string;
};

export type CreatorEconomyProfileRow = {
  id: string;
  user_id: string | null;
  creator_handle: string | null;
  bio: string | null;
  niche: string | null;
  audience_size_estimate: number | null;
  verified: boolean;
  featured: boolean;
  total_webinars_hosted: number;
  total_attendees_served: number;
  total_revenue_generated: number;
  follower_count: number;
  public_profile_enabled: boolean;
  social_links: Json;
  created_at: string;
};

export type CreatorFollowRow = {
  id: string;
  follower_id: string | null;
  creator_id: string | null;
  followed_at: string;
};

export type VideoChapterRow = {
  id: string;
  webinar_id: string | null;
  title: string;
  start_seconds: number;
  end_seconds: number;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

export type InteractiveElementRow = {
  id: string;
  webinar_id: string | null;
  element_type: string;
  config: Json;
  video_offset_seconds: number;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
};

export type DocumentationPageRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: string;
  subcategory: string | null;
  position: number;
  is_published: boolean;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LocalPaymentIntentRow = {
  id: string;
  provider: string;
  provider_reference: string;
  user_id: string | null;
  plan_slug: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

// ─── Phase 15: autonomous generation, voice cloning, real-time translation,
// autonomous agents, CRM, co-hosting, predictive nurture, federation.
// Matches supabase/migrations/0051_phase15_foundation.sql.

export type AutonomousWebinarRow = {
  id: string;
  webinar_id: string | null;
  user_id: string | null;
  topic: string;
  target_audience: string;
  offer_description: string;
  niche: string;
  generation_status: string;
  script_generated_at: string | null;
  presentation_generated_at: string | null;
  voice_cloned_at: string | null;
  video_assembled_at: string | null;
  personas_generated_at: string | null;
  automation_configured_at: string | null;
  published_at: string | null;
  generation_log: Json;
  estimated_completion_minutes: number | null;
  config: Json;
  error: string | null;
  created_at: string;
};

export type VoiceCloneRow = {
  id: string;
  user_id: string | null;
  clone_name: string;
  provider: string;
  provider_voice_id: string;
  sample_audio_url: string | null;
  status: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type AiPresentationRow = {
  id: string;
  webinar_id: string | null;
  user_id: string | null;
  topic: string;
  slide_count: number;
  slides: Json;
  theme: string;
  status: string;
  video_url: string | null;
  created_at: string;
  updated_at: string;
};

export type RealTimeTranslationRow = {
  id: string;
  session_id: string | null;
  webinar_id: string | null;
  source_language: string;
  target_languages: Json;
  transcription_provider: string;
  translation_provider: string;
  is_active: boolean;
  latency_ms: number | null;
  created_at: string;
};

export type TranslationSegmentRow = {
  id: string;
  session_id: string | null;
  webinar_id: string | null;
  original_text: string;
  translations: Json;
  start_time_seconds: number;
  end_time_seconds: number;
  speaker: string;
  confidence: number | null;
  created_at: string;
};

export type AutonomousAgentRow = {
  id: string;
  user_id: string | null;
  webinar_id: string | null;
  agent_type: string;
  agent_name: string;
  personality: Json;
  objectives: Json;
  constraints: Json;
  conversation_memory: Json;
  is_active: boolean;
  messages_sent: number;
  deals_closed: number;
  total_revenue_attributed: number;
  created_at: string;
};

export type AgentConversationRow = {
  id: string;
  agent_id: string | null;
  registrant_id: string | null;
  channel: string;
  status: string;
  messages: Json;
  lead_temperature: string;
  next_action: string | null;
  next_action_at: string | null;
  converted: boolean;
  converted_at: string | null;
  revenue_attributed: number;
  created_at: string;
  updated_at: string;
};

export type DealPipelineRow = {
  id: string;
  user_id: string | null;
  name: string;
  stages: Json;
  is_default: boolean;
  created_at: string;
};

export type DealRow = {
  id: string;
  pipeline_id: string | null;
  webinar_id: string | null;
  registrant_id: string | null;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  activities: Json;
  won: boolean;
  lost: boolean;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CoHostRow = {
  id: string;
  webinar_id: string | null;
  host_user_id: string | null;
  co_host_user_id: string | null;
  co_host_email: string | null;
  permissions: Json;
  status: string;
  invite_token: string | null;
  invite_expires_at: string | null;
  invited_at: string;
  accepted_at: string | null;
};

export type CoHostSessionRow = {
  id: string;
  session_id: string | null;
  co_host_id: string | null;
  joined_at: string | null;
  left_at: string | null;
  messages_sent: number;
  is_active: boolean;
};

export type PlatformFederationRow = {
  id: string;
  owner_user_id: string | null;
  host_platform_url: string;
  partner_platform_url: string;
  partnership_type: string;
  shared_audience: boolean;
  shared_analytics: boolean;
  cross_promotion_enabled: boolean;
  api_key_hash: string;
  status: string;
  created_at: string;
};

export type FederatedAudienceRow = {
  id: string;
  federation_id: string | null;
  email_hash: string;
  shared_at: string;
  source_platform: string;
  consent_given: boolean;
};

export type PredictiveNurtureSequenceRow = {
  id: string;
  webinar_id: string | null;
  registrant_id: string | null;
  sequence_type: string;
  predicted_conversion_date: string | null;
  optimal_contact_times: Json;
  preferred_channel: string;
  personalisation_data: Json;
  touchpoints: Json;
  status: string;
  messages_sent: number;
  last_message_sent_at: string | null;
  converted: boolean;
  created_at: string;
};

export type VoiceMessageRow = {
  id: string;
  agent_conversation_id: string | null;
  registrant_id: string | null;
  voice_clone_id: string | null;
  script: string;
  audio_url: string | null;
  duration_seconds: number | null;
  channel: string;
  status: string;
  delivered_at: string | null;
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
        | "team_id"
        | "script_id"
        | "series_id"
        | "on_demand_enabled"
        | "on_demand_expires_hours"
        | "on_demand_allow_seek"
        | "certificate_enabled"
        | "certificate_min_watch_percentage"
        | "certificate_template_id"
        | "exit_survey_enabled"
        | "private_messaging_enabled"
        | "raise_hand_enabled"
        | "primary_language"
        | "supported_languages"
        | "mode"
        | "host_name"
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
        | "upsell_eligible"
        | "upsell_eligible_at"
        | "upsell_sent_at"
        | "upsell_webinar_id"
        | "upsell_source_webinar_id"
        | "upsell_bought_at"
        | "cele_bio_synced"
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
        | "bump_id"
        | "bump_amount_cents"
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
      webinar_offer_bumps: Table<
        WebinarOfferBumpRow,
        "id" | "description" | "is_active" | "created_at"
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
      unsubscribes: Table<UnsubscribeRow, "id" | "unsubscribed_at" | "email_hash">;
      app_config: Table<AppConfigRow, "updated_at">;
      admin_ip_allowlist: Table<AdminIpAllowlistRow, "id" | "created_by" | "created_at">;
      disputes: Table<
        DisputeRow,
        "id" | "purchase_id" | "stripe_charge_id" | "reason" | "webinar_id"
          | "owner_id" | "created_at" | "resolved_at"
      >;
      content_reports: Table<
        ContentReportRow,
        | "id"
        | "session_id"
        | "registrant_id"
        | "detail"
        | "reporter_fingerprint"
        | "status"
        | "resolution"
        | "reviewed_by"
        | "reviewed_at"
        | "created_at"
      >;
      white_label_configs: Table<
        WhiteLabelConfigRow,
        | "id" | "brand_logo_url" | "brand_favicon_url" | "primary_colour" | "secondary_colour"
        | "background_colour" | "custom_domain" | "custom_domain_verified" | "hide_loopinglive_branding"
        | "custom_login_page_headline" | "custom_login_page_subheadline" | "custom_support_email"
        | "custom_terms_url" | "custom_privacy_url" | "email_from_name" | "email_from_address"
        | "smtp_host" | "smtp_port" | "smtp_username" | "smtp_password_encrypted" | "use_custom_smtp"
        | "created_at" | "updated_at"
      >;
      webinar_series: Table<
        WebinarSeriesRow,
        "id" | "description" | "thumbnail_url" | "is_sequential" | "is_active" | "created_at" | "updated_at"
      >;
      webinar_series_items: Table<
        WebinarSeriesItemRow,
        "id" | "unlock_after_days" | "unlock_after_completion" | "unlock_delay_hours" | "created_at"
      >;
      series_progress: Table<
        SeriesProgressRow,
        "id" | "current_webinar_id" | "completed_webinar_ids" | "started_at" | "last_activity_at"
      >;
      on_demand_access: Table<
        OnDemandAccessRow,
        | "id" | "access_token" | "expires_at" | "first_accessed_at" | "last_accessed_at"
        | "watch_seconds" | "watch_percentage" | "is_active" | "created_at"
      >;
      certificate_templates: Table<
        CertificateTemplateRow,
        "id" | "user_id" | "is_default" | "created_at"
      >;
      certificates: Table<
        CertificateRow,
        "id" | "issued_at" | "download_url" | "template_id"
      >;
      exit_surveys: Table<
        ExitSurveyRow,
        "id" | "title" | "questions" | "is_active" | "created_at"
      >;
      exit_survey_responses: Table<
        ExitSurveyResponseRow,
        "id" | "session_id" | "submitted_at"
      >;
      private_messages: Table<
        PrivateMessageRow,
        "id" | "is_read" | "read_at" | "sent_at"
      >;
      raised_hands: Table<
        RaisedHandRow,
        "id" | "raised_at" | "lowered_at" | "acknowledged_at"
      >;
      ai_generated_personas: Table<
        AiGeneratedPersonaRow,
        "id" | "generation_prompt" | "niche" | "locations" | "status" | "completed_at" | "created_at"
      >;
      upsell_sequences: Table<
        UpsellSequenceRow,
        | "id" | "owner_id" | "delay_days" | "is_active" | "email_subject" | "email_body"
        | "sms_body" | "whatsapp_body" | "created_at"
      >;
      cele_bio_connections: Table<
        CeleBioConnectionRow,
        | "id" | "refresh_token_encrypted" | "auto_sync_enabled" | "show_on_profile"
        | "use_cele_bio_payments" | "connected_at" | "last_synced_at"
      >;
      cele_bio_synced_webinars: Table<
        CeleBioSyncedWebinarRow,
        "id" | "cele_bio_product_id" | "synced_at"
      >;
      webinar_translations: Table<
        WebinarTranslationRow,
        | "id" | "title" | "description" | "registration_headline" | "registration_subheadline"
        | "what_you_will_learn" | "cta_button_text" | "auto_translated" | "created_at" | "updated_at"
      >;
      attendee_scores: Table<
        AttendeeScoreRow,
        | "id" | "engagement_score" | "conversion_likelihood" | "churn_risk"
        | "lifetime_value_estimate" | "score_factors" | "scored_at" | "updated_at"
      >;
      conversion_predictions: Table<
        ConversionPredictionRow,
        "id" | "prediction_factors" | "predicted_at" | "outcome" | "outcome_recorded_at"
      >;
      ab_tests: Table<
        AbTestRow,
        "id" | "description" | "traffic_split" | "status" | "winner" | "confidence_level"
        | "started_at" | "ended_at" | "created_at"
      >;
      ab_test_assignments: Table<
        AbTestAssignmentRow,
        "id" | "assigned_at" | "converted" | "converted_at"
      >;
      ab_test_results: Table<
        AbTestResultRow,
        "id" | "impressions" | "conversions" | "conversion_rate"
        | "statistical_significance" | "calculated_at"
      >;
      ad_creatives: Table<
        AdCreativeRow,
        "id" | "user_id" | "image_url" | "video_url" | "generated_by_ai"
        | "performance_score" | "status" | "created_at"
      >;
      personalisation_rules: Table<
        PersonalisationRuleRow,
        "id" | "priority" | "is_active" | "created_at"
      >;
      personalisation_events: Table<
        PersonalisationEventRow,
        "id" | "session_id" | "rule_id" | "data" | "created_at"
      >;
      support_conversations: Table<
        SupportConversationRow,
        "id" | "session_id" | "status" | "channel" | "messages" | "resolved_at"
        | "satisfaction_rating" | "created_at" | "updated_at"
      >;
      schedule_optimisations: Table<
        ScheduleOptimisationRow,
        "id" | "confidence_score" | "applied" | "created_at"
      >;
      revenue_forecasts: Table<
        RevenueForecastRow,
        | "id" | "webinar_id" | "predicted_registrants" | "predicted_attendees"
        | "predicted_conversions" | "predicted_revenue" | "confidence_interval_low"
        | "confidence_interval_high" | "actual_revenue" | "accuracy_percentage"
        | "model_version" | "created_at"
      >;
      ai_insights: Table<
        AiInsightRow,
        "id" | "user_id" | "webinar_id" | "action_items" | "priority" | "is_read"
        | "is_dismissed" | "created_at"
      >;
      smart_segments: Table<
        SmartSegmentRow,
        "id" | "description" | "registrant_count" | "last_evaluated_at" | "is_dynamic" | "created_at"
      >;
      competitor_intelligence: Table<
        CompetitorIntelligenceRow,
        "id" | "competitor_url" | "data_points" | "last_analysed_at" | "created_at"
      >;
      platform_health_metrics: Table<
        PlatformHealthMetricRow,
        "id" | "metric_unit" | "threshold_warning" | "threshold_critical" | "status"
        | "metadata" | "recorded_at"
      >;
      teams: Table<
        TeamRow,
        | "id" | "owner_id" | "logo_url" | "plan_slug" | "max_members" | "max_webinars"
        | "stripe_customer_id" | "stripe_subscription_id" | "subscription_status"
        | "created_at" | "updated_at"
      >;
      team_members: Table<
        TeamMemberRow,
        "id" | "invited_by" | "invited_at" | "accepted_at" | "status" | "permissions"
      >;
      team_invitations: Table<
        TeamInvitationRow,
        "id" | "invited_by" | "token" | "expires_at" | "accepted_at" | "created_at"
      >;
      marketplace_seller_profiles: Table<
        MarketplaceSellerProfileRow,
        | "id" | "bio" | "avatar_url" | "website_url" | "total_sales"
        | "total_earnings" | "average_rating" | "stripe_connect_account_id"
        | "stripe_connect_onboarded" | "payout_enabled" | "created_at"
      >;
      marketplace_listings: Table<
        MarketplaceListingRow,
        | "id" | "currency" | "preview_url" | "thumbnail_url" | "demo_url"
        | "tags" | "included_items" | "total_sales" | "average_rating"
        | "review_count" | "is_featured" | "is_approved" | "is_active"
        | "stripe_product_id" | "stripe_price_id" | "created_at" | "updated_at"
      >;
      marketplace_purchases: Table<
        MarketplacePurchaseRow,
        | "id" | "seller_id" | "stripe_payment_intent_id" | "status" | "purchased_at"
      >;
      marketplace_reviews: Table<
        MarketplaceReviewRow,
        | "id" | "purchase_id" | "title" | "body" | "is_verified_purchase" | "created_at"
      >;
      academy_courses: Table<
        AcademyCourseRow,
        | "id" | "thumbnail_url" | "difficulty" | "is_free" | "is_published"
        | "position" | "created_at"
      >;
      academy_lessons: Table<
        AcademyLessonRow,
        "id" | "description" | "video_url" | "duration_seconds" | "is_preview" | "created_at"
      >;
      academy_progress: Table<
        AcademyProgressRow,
        "id" | "lesson_id" | "completed_lesson_ids" | "completed_at"
      >;
      webinar_scripts: Table<
        WebinarScriptRow,
        | "id" | "webinar_id" | "target_audience" | "offer_description"
        | "webinar_length_minutes" | "status" | "created_at" | "updated_at"
      >;
      enterprise_accounts: Table<
        EnterpriseAccountRow,
        Exclude<keyof EnterpriseAccountRow, "team_id">
      >;
      enterprise_leads: Table<
        EnterpriseLeadRow,
        "id" | "phone" | "team_size" | "monthly_sessions" | "current_platform"
          | "message" | "status" | "assigned_to" | "created_at"
      >;
      push_notification_subscriptions: Table<
        PushNotificationSubscriptionRow,
        | "id" | "user_id" | "registrant_id" | "app_version" | "is_active"
        | "created_at" | "updated_at"
      >;
      graphql_query_logs: Table<
        GraphqlQueryLogRow,
        Exclude<keyof GraphqlQueryLogRow, "id">
      >;
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

      // ─── Phase 14 ───────────────────────────────────────────────────────
      localized_pricing: Table<
        LocalizedPricingRow,
        | "id" | "purchasing_power_parity_factor" | "stripe_price_id_monthly"
        | "stripe_price_id_yearly" | "stripe_price_id_lifetime" | "payment_methods"
        | "is_active" | "created_at"
      >;
      local_payment_methods: Table<
        LocalPaymentMethodRow,
        "id" | "provider_config" | "is_active" | "created_at"
      >;
      accessibility_preferences: Table<
        AccessibilityPreferencesRow,
        Exclude<keyof AccessibilityPreferencesRow, "user_id">
      >;
      sso_configurations: Table<
        SsoConfigurationRow,
        | "id" | "team_id" | "entity_id" | "attribute_mapping" | "is_active"
        | "require_sso" | "created_at" | "updated_at"
      >;
      sso_sessions: Table<
        SsoSessionRow,
        "id" | "team_id" | "user_id" | "provider_session_id" | "created_at"
      >;
      audit_logs: Table<
        AuditLogRow,
        | "id" | "user_id" | "team_id" | "resource_id" | "old_value" | "new_value"
        | "ip_address" | "user_agent" | "session_id" | "created_at"
      >;
      soc2_evidence: Table<
        Soc2EvidenceRow,
        "id" | "collected_at" | "review_period_start" | "review_period_end"
      >;
      data_export_requests: Table<
        DataExportRequestRow,
        "id" | "user_id" | "status" | "export_url" | "expires_at" | "requested_at" | "completed_at"
      >;
      gdpr_requests: Table<
        GdprRequestRow,
        "id" | "webinar_id" | "status" | "processed_by" | "processed_at" | "notes" | "created_at"
      >;
      plugins: Table<
        PluginRow,
        | "id" | "developer_id" | "version" | "icon_url" | "screenshots" | "pricing_type"
        | "price" | "install_count" | "average_rating" | "is_approved" | "is_active"
        | "created_at" | "updated_at"
      >;
      plugin_installations: Table<
        PluginInstallationRow,
        "id" | "plugin_id" | "user_id" | "webinar_id" | "settings" | "is_active" | "installed_at"
      >;
      plugin_events: Table<
        PluginEventRow,
        "id" | "plugin_id" | "installation_id" | "payload" | "response" | "status" | "created_at"
      >;
      multi_stream_destinations: Table<
        MultiStreamDestinationRow,
        "id" | "webinar_id" | "user_id" | "is_active" | "last_streamed_at" | "created_at"
      >;
      creator_economy_profiles: Table<
        CreatorEconomyProfileRow,
        | "id" | "user_id" | "creator_handle" | "bio" | "niche" | "audience_size_estimate"
        | "verified" | "featured" | "total_webinars_hosted" | "total_attendees_served"
        | "total_revenue_generated" | "follower_count" | "public_profile_enabled"
        | "social_links" | "created_at"
      >;
      creator_follows: Table<
        CreatorFollowRow,
        "id" | "follower_id" | "creator_id" | "followed_at"
      >;
      video_chapters: Table<
        VideoChapterRow,
        "id" | "webinar_id" | "description" | "thumbnail_url" | "created_at"
      >;
      interactive_elements: Table<
        InteractiveElementRow,
        "id" | "webinar_id" | "duration_seconds" | "is_active" | "created_at"
      >;
      documentation_pages: Table<
        DocumentationPageRow,
        "id" | "subcategory" | "position" | "is_published" | "last_edited_by" | "created_at" | "updated_at"
      >;
      local_payment_intents: Table<
        LocalPaymentIntentRow,
        "id" | "user_id" | "status" | "created_at" | "completed_at"
      >;

      // ─── Phase 15 ───────────────────────────────────────────────────────
      autonomous_webinars: Table<
        AutonomousWebinarRow,
        | "id" | "webinar_id" | "user_id" | "generation_status" | "script_generated_at"
        | "presentation_generated_at" | "voice_cloned_at" | "video_assembled_at"
        | "personas_generated_at" | "automation_configured_at" | "published_at"
        | "generation_log" | "estimated_completion_minutes" | "config" | "error" | "created_at"
      >;
      voice_clones: Table<
        VoiceCloneRow,
        "id" | "user_id" | "sample_audio_url" | "status" | "is_primary" | "created_at" | "updated_at"
      >;
      ai_presentations: Table<
        AiPresentationRow,
        | "id" | "webinar_id" | "user_id" | "slide_count" | "slides" | "theme" | "status"
        | "video_url" | "created_at" | "updated_at"
      >;
      real_time_translations: Table<
        RealTimeTranslationRow,
        | "id" | "session_id" | "webinar_id" | "source_language" | "transcription_provider"
        | "translation_provider" | "is_active" | "latency_ms" | "created_at"
      >;
      translation_segments: Table<
        TranslationSegmentRow,
        "id" | "session_id" | "webinar_id" | "speaker" | "confidence" | "created_at"
      >;
      autonomous_agents: Table<
        AutonomousAgentRow,
        | "id" | "user_id" | "webinar_id" | "constraints" | "conversation_memory" | "is_active"
        | "messages_sent" | "deals_closed" | "total_revenue_attributed" | "created_at"
      >;
      agent_conversations: Table<
        AgentConversationRow,
        | "id" | "agent_id" | "registrant_id" | "status" | "messages" | "lead_temperature"
        | "next_action" | "next_action_at" | "converted" | "converted_at" | "revenue_attributed"
        | "created_at" | "updated_at"
      >;
      deal_pipelines: Table<
        DealPipelineRow,
        "id" | "user_id" | "stages" | "is_default" | "created_at"
      >;
      deals: Table<
        DealRow,
        | "id" | "pipeline_id" | "webinar_id" | "registrant_id" | "value" | "probability"
        | "expected_close_date" | "assigned_to" | "notes" | "activities" | "won" | "lost"
        | "lost_reason" | "created_at" | "updated_at"
      >;
      co_hosts: Table<
        CoHostRow,
        | "id" | "webinar_id" | "host_user_id" | "co_host_user_id" | "co_host_email"
        | "permissions" | "status" | "invite_token" | "invite_expires_at" | "invited_at" | "accepted_at"
      >;
      co_host_sessions: Table<
        CoHostSessionRow,
        "id" | "session_id" | "co_host_id" | "joined_at" | "left_at" | "messages_sent" | "is_active"
      >;
      platform_federation: Table<
        PlatformFederationRow,
        | "id" | "owner_user_id" | "shared_audience" | "shared_analytics"
        | "cross_promotion_enabled" | "status" | "created_at"
      >;
      federated_audiences: Table<
        FederatedAudienceRow,
        "id" | "federation_id" | "shared_at" | "consent_given"
      >;
      predictive_nurture_sequences: Table<
        PredictiveNurtureSequenceRow,
        | "id" | "webinar_id" | "registrant_id" | "predicted_conversion_date"
        | "optimal_contact_times" | "preferred_channel" | "personalisation_data" | "touchpoints"
        | "status" | "messages_sent" | "last_message_sent_at" | "converted" | "created_at"
      >;
      voice_messages: Table<
        VoiceMessageRow,
        | "id" | "agent_conversation_id" | "registrant_id" | "voice_clone_id" | "audio_url"
        | "duration_seconds" | "status" | "delivered_at" | "created_at"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      /** Which admins have 2FA on, for a screen that can chase the ones who do not. */
      admin_2fa_status: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string;
          full_name: string;
          admin_role: string | null;
          enabled: boolean;
          enabled_at: string | null;
          recovery_codes_left: number;
        }[];
      };
      /** Per-host dispute rate and whether it crosses the warning line. */
      host_fraud_signals: {
        Args: { p_owner_id: string };
        Returns: Json;
      };
      /** Every host whose numbers cross the line, for a screen to list. */
      flagged_hosts: {
        Args: Record<string, never>;
        Returns: {
          owner_id: string;
          email: string;
          full_name: string;
          plan_slug: string;
          signals: Json;
        }[];
      };
      /** Whether an IP may reach the console. Off, or an empty list, allows all. */
      admin_ip_allowed: {
        Args: { p_ip: string };
        Returns: boolean;
      };
      /** Recomputes a listing's average rating and count from real reviews. */
      recalculate_listing_rating: {
        Args: { p_listing_id: string };
        Returns: undefined;
      };
      /** Open reports, with the context needed to judge one. */
      report_queue: {
        Args: { p_status?: string };
        Returns: {
          id: string;
          webinar_id: string;
          webinar_title: string | null;
          owner_id: string | null;
          owner_email: string | null;
          owner_plan: string | null;
          reason: string;
          detail: string | null;
          status: string;
          created_at: string;
          reports_for_webinar: number;
          registrants_reached: number;
        }[];
      };
      /**
       * Whether the site is deliberately down, and what to say.
       *
       * Security definer so the proxy can read it with the anon key —
       * app_config itself holds the cron secret and must stay service-role.
       */
      maintenance_status: {
        Args: Record<string, never>;
        Returns: Json;
      };
      /** Everything held about one registrant, as one JSON document. */
      export_registrant_data: {
        Args: { p_registrant_id: string };
        Returns: Json;
      };
      /** Erases them. Keeps the sale, unlinked, and the suppression, hashed. */
      erase_registrant: {
        Args: { p_registrant_id: string };
        Returns: Json;
      };
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
