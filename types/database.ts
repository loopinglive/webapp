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
  | "history_cleared";

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

export type Database = {
  public: {
    Tables: {
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
        "id" | "schedule_id" | "ends_at" | "status" | "created_at"
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
