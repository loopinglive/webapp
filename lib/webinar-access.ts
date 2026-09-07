import "server-only";

import { getAdminUser } from "@/lib/admin-auth";
import { getUserAccount, type UserAccount } from "@/lib/billing/account";
import { getTeamMembership } from "@/lib/teams/auth";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Who is allowed to act on webinar-scoped resources, and why.
 *
 * Three ways in: the platform operator (env-email admin, unrestricted —
 * matches the single-operator convenience the rest of the product already
 * assumes), the account that owns this specific webinar, or an owner/admin
 * on the team this webinar belongs to. A signed-in customer who simply
 * isn't this webinar's owner is refused exactly like an anonymous visitor —
 * ownership is the boundary, not "has an account".
 *
 * This is the fix for a real gap: every webinar-scoped route in this
 * codebase used to check `requireAdmin()` (the single hardcoded operator
 * email) regardless of who actually owned the webinar, which meant a paying
 * customer could never reach their own webinar's settings. Plan-gating
 * (e.g. `planPermissions().canPublish` in the publish route) was already
 * correctly written underneath that — it was just unreachable.
 */
export type WebinarAccessResult =
  | { ok: true; isPlatformAdmin: boolean; account: UserAccount | null; actorId: string; response: null }
  | { ok: false; isPlatformAdmin: false; account: UserAccount | null; actorId: null; response: Response };

async function ownsViaTeam(teamId: string): Promise<boolean> {
  const membership = await getTeamMembership(teamId);
  return Boolean(membership && (membership.role === "owner" || membership.role === "admin"));
}

function refuse(status: number, error: string, account: UserAccount | null = null): WebinarAccessResult {
  return { ok: false, isPlatformAdmin: false, account, actorId: null, response: Response.json({ error }, { status }) };
}

/** Gate for a route scoped to one existing webinar (its id already known). */
export async function requireWebinarAccess(webinarId: string): Promise<WebinarAccessResult> {
  const admin = await getAdminUser();
  if (admin) return { ok: true, isPlatformAdmin: true, account: null, actorId: admin.id, response: null };

  const account = await getUserAccount();
  if (!account) return refuse(401, "Not signed in");
  if (account.is_suspended) return refuse(403, "This account has been suspended.");

  const supabase = createServiceClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("owner_id, team_id")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) return refuse(404, "Webinar not found", account);
  if (webinar.owner_id === account.id) {
    return { ok: true, isPlatformAdmin: false, account, actorId: account.id, response: null };
  }
  if (webinar.team_id && (await ownsViaTeam(webinar.team_id))) {
    return { ok: true, isPlatformAdmin: false, account, actorId: account.id, response: null };
  }

  return refuse(403, "Not authorised", account);
}

/** Same gate, starting from a registrant id instead of a webinar id. */
export async function requireRegistrantAccess(registrantId: string): Promise<WebinarAccessResult> {
  const supabase = createServiceClient();
  const { data: registrant } = await supabase
    .from("registrants")
    .select("webinar_id")
    .eq("id", registrantId)
    .maybeSingle();

  if (!registrant) return refuse(404, "Registrant not found");
  return requireWebinarAccess(registrant.webinar_id);
}

/** Same gate, starting from a webinar session id instead of a webinar id. */
export async function requireSessionAccess(sessionId: string): Promise<WebinarAccessResult> {
  const supabase = createServiceClient();
  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("webinar_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return refuse(404, "Session not found");
  return requireWebinarAccess(session.webinar_id);
}

/**
 * Gate for a route with no specific webinar yet — creating one, or listing
 * "mine". Any signed-in, non-suspended account passes; `isPlatformAdmin`
 * tells the caller whether to show everything or scope to their own rows.
 */
export async function requireAccountAccess(): Promise<WebinarAccessResult> {
  const admin = await getAdminUser();
  if (admin) return { ok: true, isPlatformAdmin: true, account: null, actorId: admin.id, response: null };

  const account = await getUserAccount();
  if (!account) return refuse(401, "Not signed in");
  if (account.is_suspended) return refuse(403, "This account has been suspended.");

  return { ok: true, isPlatformAdmin: false, account, actorId: account.id, response: null };
}
