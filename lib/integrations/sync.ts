import "server-only";

import {
  syncActiveCampaign,
  syncConvertKit,
  syncGoHighLevel,
  syncMailchimp,
  type Contact,
  type ProviderSettings,
} from "@/lib/integrations/providers";
import type { WebhookEvent } from "@/lib/webhooks/events";
import { createServiceClient } from "@/lib/supabase/server";

/** Event → the tag that event adds, on top of the base tags. */
const EVENT_TAGS: Partial<Record<WebhookEvent, string>> = {
  "registrant.created": "registered",
  "registrant.attended": "attended",
  "registrant.completed": "completed-webinar",
  "registrant.clicked_offer": "clicked-offer",
  "registrant.bought": "buyer",
  "registrant.no_show": "no-show",
};

/** A tag safe for every provider: lowercase, no spaces, bounded length. */
function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function buildTags(
  event: WebhookEvent,
  webinarTitle: string,
  prefix?: string
): string[] {
  const tags = ["loopinglive", slug(webinarTitle)];
  const eventTag = EVENT_TAGS[event];
  if (eventTag) tags.push(eventTag);

  return prefix
    ? tags.map((tag) => `${prefix}${tag}`)
    : tags.filter(Boolean);
}

function splitName(fullName: string) {
  const parts = (fullName ?? "").trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

/**
 * Pushes a registrant to every connected marketing platform.
 *
 * Each provider is attempted independently and every failure is swallowed
 * after being recorded: a host's Mailchimp key expiring must not stop a
 * registration from completing, and must not stop ConvertKit from syncing
 * either.
 */
export async function syncContactToIntegrations(
  userId: string | null,
  event: WebhookEvent,
  registrant: {
    email: string;
    full_name: string | null;
    phone: string | null;
  },
  webinarTitle: string
): Promise<void> {
  if (!userId || !registrant.email) return;

  const supabase = createServiceClient();

  const { data: integrations } = await supabase
    .from("integrations")
    .select("id, provider, api_key, settings")
    .eq("user_id", userId)
    .eq("status", "connected");

  if (!integrations?.length) return;

  const { firstName, lastName } = splitName(registrant.full_name ?? "");

  await Promise.all(
    integrations.map(async (integration) => {
      const settings = (integration.settings ?? {}) as ProviderSettings;

      // A host can switch off individual events per integration.
      const enabled = settings[`on_${event.replace(".", "_")}`];
      if (enabled === "false") return;

      const contact: Contact = {
        email: registrant.email,
        firstName,
        lastName,
        phone: registrant.phone,
        tags: buildTags(event, webinarTitle, settings.tagPrefix),
      };

      try {
        const apiKey = integration.api_key ?? "";

        switch (integration.provider) {
          case "mailchimp":
            await syncMailchimp(apiKey, settings, contact);
            break;
          case "convertkit":
            await syncConvertKit(apiKey, settings, contact);
            break;
          case "activecampaign":
            await syncActiveCampaign(apiKey, settings, contact);
            break;
          case "gohighlevel":
            await syncGoHighLevel(apiKey, settings, contact);
            break;
          default:
            // Calendly is not a contact destination.
            return;
        }

        await supabase
          .from("integrations")
          .update({ last_synced_at: new Date().toISOString(), last_error: null })
          .eq("id", integration.id);
      } catch (error) {
        // Recorded on the integration so the host can see it in the hub,
        // rather than disappearing into server logs they cannot read.
        await supabase
          .from("integrations")
          .update({ last_error: (error as Error).message.slice(0, 300) })
          .eq("id", integration.id);
      }
    })
  );
}

/** Fires the sync without blocking the request that triggered it. */
export function syncContactInBackground(
  userId: string | null,
  event: WebhookEvent,
  registrant: { email: string; full_name: string | null; phone: string | null },
  webinarTitle: string
) {
  void syncContactToIntegrations(userId, event, registrant, webinarTitle).catch(() => {
    /* recorded per integration above */
  });
}
