import "server-only";

import { getUserAccount } from "@/lib/billing/account";
import { requireWebinarAccess } from "@/lib/webinar-access";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type CoHostPermissions = {
  /** Send messages into the live chat as a host. */
  chat: boolean;
  /** Delete messages, mute attendees, handle raised hands. */
  moderate: boolean;
  /** Reveal or hide the offer during the session. */
  offers: boolean;
  /** See the webinar's analytics and attendee list. */
  analytics: boolean;
};

export const DEFAULT_PERMISSIONS: CoHostPermissions = {
  chat: true,
  moderate: true,
  offers: false,
  analytics: false,
};

export function parsePermissions(raw: Json): CoHostPermissions {
  const value = (raw ?? {}) as Partial<CoHostPermissions>;
  return {
    chat: value.chat ?? DEFAULT_PERMISSIONS.chat,
    moderate: value.moderate ?? DEFAULT_PERMISSIONS.moderate,
    offers: value.offers ?? DEFAULT_PERMISSIONS.offers,
    analytics: value.analytics ?? DEFAULT_PERMISSIONS.analytics,
  };
}

export type CoHostAccessResult =
  | { ok: true; isOwner: boolean; coHostId: string | null; permissions: CoHostPermissions; actorId: string; response: null }
  | { ok: false; response: Response };

/**
 * A co-host is deliberately NOT folded into requireWebinarAccess.
 *
 * That helper gates nearly every admin route on this webinar — settings,
 * publishing, deletion — and a co-host is invited to help run a session, not
 * to own the webinar. So co-host rights live here, are per-permission, and
 * are only consulted by the specific routes a co-host is meant to reach.
 *
 * Revocation takes effect immediately for the same reason: there is no
 * long-lived co-host session token, so the next server action after the row
 * is deleted (or its status changed) simply fails this check.
 */
export async function requireCoHostAccess(
  webinarId: string,
  permission: keyof CoHostPermissions
): Promise<CoHostAccessResult> {
  // Owners, team admins and the platform operator keep full rights.
  const ownerAccess = await requireWebinarAccess(webinarId);
  if (ownerAccess.ok) {
    return {
      ok: true,
      isOwner: true,
      coHostId: null,
      permissions: { chat: true, moderate: true, offers: true, analytics: true },
      actorId: ownerAccess.actorId,
      response: null,
    };
  }

  const account = await getUserAccount();
  if (!account) return { ok: false, response: Response.json({ error: "Not signed in" }, { status: 401 }) };

  const supabase = createServiceClient();
  const { data: coHost } = await supabase
    .from("co_hosts")
    .select("id, permissions, status")
    .eq("webinar_id", webinarId)
    .eq("co_host_user_id", account.id)
    .maybeSingle();

  if (!coHost || coHost.status !== "accepted") {
    return { ok: false, response: Response.json({ error: "Not authorised" }, { status: 403 }) };
  }

  const permissions = parsePermissions(coHost.permissions);
  if (!permissions[permission]) {
    return { ok: false, response: Response.json({ error: `You don't have "${permission}" permission on this webinar.` }, { status: 403 }) };
  }

  return { ok: true, isOwner: false, coHostId: coHost.id, permissions, actorId: account.id, response: null };
}
