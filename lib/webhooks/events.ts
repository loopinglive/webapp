/**
 * Webhook event names and labels.
 *
 * Deliberately separate from dispatch.ts, which is `server-only`: the webhook
 * manager and the API docs are client components and need these names, but
 * must not pull the dispatcher (and the service-role client behind it) into
 * the browser bundle.
 */
export const WEBHOOK_EVENTS = [
  "registrant.created",
  "registrant.attended",
  "registrant.completed",
  "registrant.clicked_offer",
  "registrant.bought",
  "registrant.no_show",
  "session.started",
  "session.ended",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const EVENT_LABELS: Record<WebhookEvent, string> = {
  "registrant.created": "Someone registers",
  "registrant.attended": "Someone joins the room",
  "registrant.completed": "Someone watches 90% or more",
  "registrant.clicked_offer": "Someone clicks the offer",
  "registrant.bought": "Someone is marked as bought",
  "registrant.no_show": "Someone registered but never showed",
  "session.started": "A session goes live",
  "session.ended": "A session finishes",
};
