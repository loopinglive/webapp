import type {
  AiPersonaRow,
  AiReplyRow,
  PersonaModeRow,
  FakePersonaRow,
  LiveChatMessageRow,
  RegistrantRow,
  TimedCommentRow,
  WebinarRow,
  WebinarScheduleRow,
  WebinarSessionRow,
  WebinarOfferRow,
  TimedPollRow,
  TimedHandoutRow,
  TimedCtaRow,
  TimedPinnedMessageRow,
} from "./database";

export type { PollOption, CustomField, CustomFieldType } from "./database";

export type RegistrationConfig =
  import("./database").RegistrationPageConfigRow;
export type AttendeeSource = import("./database").AttendeeSourceRow;
export type AttendeeEvent = import("./database").AttendeeEventRow;

/** A row in the attendee table: registrant plus its computed segment. */
export type AttendeeListItem = Registrant & {
  segment: string;
  utm_source: string | null;
  utm_campaign: string | null;
};

export type SegmentCounts = Record<string, number> & { total: number };

export type AttendeeProfilePayload = {
  attendee: Registrant;
  segment: string;
  source: AttendeeSource | null;
  events: AttendeeEvent[];
  messages: (ChatMessage & { replies: ChatMessage[] })[];
  webinarTitle: string;
  videoDurationSeconds: number | null;
};

export type Webinar = WebinarRow;
export type WebinarSchedule = WebinarScheduleRow;
export type WebinarSession = WebinarSessionRow;
export type FakePersona = FakePersonaRow;
export type TimedComment = TimedCommentRow;
export type Registrant = RegistrantRow;
export type ChatMessage = LiveChatMessageRow;
export type WebinarOffer = WebinarOfferRow;
export type TimedPoll = TimedPollRow;
export type TimedHandout = TimedHandoutRow;
export type TimedCta = TimedCtaRow;
export type TimedPinnedMessage = TimedPinnedMessageRow;
export type AiPersona = AiPersonaRow;

export type EngagementKind = "poll" | "handout" | "cta" | "pinned";

/** Sidebar progress + the publish gate. */
export type SetupChecklist = {
  video: boolean;
  schedule: boolean;
  personas: boolean;
  comments: boolean;
  engagement: boolean;
  offer: boolean;
  ai: boolean;
};

export type WebinarSummary = Webinar & {
  registrants: number;
  attendees: number;
  nextSessionAt: string | null;
};

export type WebinarSetupPayload = {
  webinar: Webinar;
  checklist: SetupChecklist;
  counts: {
    schedules: number;
    personas: number;
    comments: number;
    engagement: number;
  };
};
export type AiReply = AiReplyRow;
export type PersonaMode = PersonaModeRow;

/** personaId → mode, for the whole session. */
export type PersonaModeMap = Record<string, "ai" | "human">;

export type AdminFilter = "all" | "real" | "unanswered";

/** What the admin panel needs to boot. */
export type AdminSessionPayload = {
  session: WebinarSession;
  webinar: Pick<Webinar, "id" | "title" | "video_duration_seconds">;
  personas: AiPersona[];
  modes: PersonaModeMap;
};

/** A scripted comment joined to the persona that "sends" it. */
export type TimedCommentWithPersona = TimedComment & {
  persona: Pick<FakePersona, "id" | "name" | "avatar_url" | "location"> | null;
};

/** What the watch room needs to boot: the webinar plus its running session. */
export type SessionPayload = {
  webinar: Pick<
    Webinar,
    | "id"
    | "title"
    | "description"
    | "video_url"
    | "video_public_id"
    | "video_duration_seconds"
    | "thumbnail_url"
    | "broadcast_label"
    | "show_recorded_notice"
  >;
  session: WebinarSession | null;
  /** Seconds until start; negative once it is under way. */
  secondsUntilStart: number | null;
  state: "waiting" | "live" | "ended" | "unscheduled";
  /**
   * Server clock at the moment of the response. The room measures everything
   * against this rather than the device clock — a viewer whose laptop is three
   * minutes fast must still see the same frame as everyone else.
   */
  serverTime: string;
};

/** Stored in localStorage after registration so the room knows who is watching. */
export type StoredRegistrant = {
  id: string;
  webinarId: string;
  sessionId: string | null;
  fullName: string;
  countryFlag: string;
};

/** Name + flag only — never the email or phone. */
export type PublicJoiner = {
  id: string;
  fullName: string;
  countryFlag: string;
  createdAt: string;
};
