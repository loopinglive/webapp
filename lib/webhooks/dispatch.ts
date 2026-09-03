import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";
import type { WebhookEvent } from "@/lib/webhooks/events";
import type { Json } from "@/types/database";

export {
  WEBHOOK_EVENTS,
  EVENT_LABELS,
  type WebhookEvent,
} from "@/lib/webhooks/events";

/** Backoff between retries. Index is the attempt that just failed. */
const BACKOFF_MINUTES = [5, 30, 120, 480];
export const MAX_ATTEMPTS = 5;

const TIMEOUT_MS = 10_000;

/**
 * The signed body.
 *
 * The signature covers the exact bytes sent, not a re-serialisation of the
 * payload — otherwise a receiver reconstructing JSON in a different key order
 * would compute a different digest and reject a legitimate request.
 */
export function signBody(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Constant-time compare, for anyone verifying on our side. */
export function signatureMatches(expected: string, provided: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

type DeliveryResult = {
  ok: boolean;
  status: number | null;
  body: string | null;
  error: string | null;
};

/** One HTTP attempt. Never throws — the caller records whatever came back. */
async function deliver(
  url: string,
  secret: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<DeliveryResult> {
  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Loopinglive-Signature": signBody(body, secret),
        "X-Loopinglive-Event": eventType,
        "X-Loopinglive-Timestamp": Date.now().toString(),
        "User-Agent": "Loopinglive-Webhooks/1.0",
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // Truncated: a receiver returning an HTML error page should not put
    // kilobytes of markup into every log row.
    const text = (await response.text().catch(() => "")).slice(0, 2000);

    return {
      ok: response.ok,
      status: response.status,
      body: text,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      body: null,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

function nextRetry(attempt: number) {
  const minutes = BACKOFF_MINUTES[attempt - 1];
  if (minutes === undefined) return null;
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/**
 * Sends an event to every endpoint subscribed to it.
 *
 * Fire-and-forget by design: a webhook receiver being slow or down must never
 * slow down or fail a registration. Failures are recorded and retried by the
 * sweep rather than surfaced to the caller.
 */
export async function dispatchWebhook(
  userId: string | null,
  eventType: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  if (!userId) return;

  const supabase = createServiceClient();

  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, events")
    .eq("user_id", userId)
    .eq("is_active", true);

  const subscribed = (endpoints ?? []).filter((endpoint) => {
    const events = (endpoint.events as string[] | null) ?? [];
    // An empty subscription list means "everything", which is what someone
    // setting up their first endpoint almost always wants.
    return events.length === 0 || events.includes(eventType);
  });

  if (subscribed.length === 0) return;

  await Promise.all(
    subscribed.map(async (endpoint) => {
      const { data: log } = await supabase
        .from("webhook_logs")
        .insert({
          webhook_endpoint_id: endpoint.id,
          event_type: eventType,
          payload: payload as Json,
          status: "pending",
        })
        .select("id")
        .single();

      const result = await deliver(endpoint.url, endpoint.secret, eventType, payload);

      await supabase
        .from("webhook_logs")
        .update({
          status: result.ok ? "delivered" : "failed",
          response_status: result.status,
          response_body: result.body,
          error_message: result.error,
          sent_at: new Date().toISOString(),
          next_retry_at: result.ok ? null : nextRetry(1),
        })
        .eq("id", log!.id);
    })
  );
}

/** Re-sends one failed log row. Used by the retry sweep and the manual button. */
export async function retryWebhookLog(logId: string) {
  const supabase = createServiceClient();

  const { data: log } = await supabase
    .from("webhook_logs")
    .select("id, event_type, payload, attempt_count, webhook_endpoint_id")
    .eq("id", logId)
    .maybeSingle();

  if (!log) return { ok: false, reason: "not found" as const };

  const { data: endpoint } = await supabase
    .from("webhook_endpoints")
    .select("url, secret, is_active")
    .eq("id", log.webhook_endpoint_id)
    .maybeSingle();

  if (!endpoint?.is_active) {
    await supabase
      .from("webhook_logs")
      .update({ status: "cancelled", error_message: "Endpoint is no longer active" })
      .eq("id", log.id);
    return { ok: false, reason: "endpoint inactive" as const };
  }

  const attempt = (log.attempt_count ?? 1) + 1;
  const result = await deliver(
    endpoint.url,
    endpoint.secret,
    log.event_type,
    (log.payload ?? {}) as Record<string, unknown>
  );

  const exhausted = attempt >= MAX_ATTEMPTS;

  await supabase
    .from("webhook_logs")
    .update({
      attempt_count: attempt,
      status: result.ok
        ? "delivered"
        : exhausted
          ? "failed_permanently"
          : "failed",
      response_status: result.status,
      response_body: result.body,
      error_message: result.error,
      sent_at: new Date().toISOString(),
      next_retry_at: result.ok || exhausted ? null : nextRetry(attempt),
    })
    .eq("id", log.id);

  return { ok: result.ok, reason: result.error };
}

/**
 * Fires an event without blocking the caller.
 *
 * Used from request handlers where the user is waiting on a response — a
 * registration must not wait on someone else's Zapier endpoint.
 */
export function dispatchWebhookInBackground(
  userId: string | null,
  eventType: WebhookEvent,
  payload: Record<string, unknown>
) {
  void dispatchWebhook(userId, eventType, payload).catch(() => {
    // Already recorded in webhook_logs; nothing useful to do here.
  });
}
