import "server-only";

import { getUserAccount } from "@/lib/billing/account";
import { ROLE_LABELS, roleCan, type AdminRole, type Capability } from "@/lib/billing/roles";

/**
 * The server-side gate for admin capabilities.
 *
 * `is_admin` grants everything: customer records, refunds, impersonation. That
 * is fine with one admin and indefensible with three — a support person should
 * be able to answer a ticket without also being able to move money.
 *
 * The vocabulary itself lives in `roles.ts`, which the admin screens also
 * import; this file is only the part that needs the session.
 */
export {
  CAPABILITIES,
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  roleCan,
  type AdminRole,
  type Capability,
} from "@/lib/billing/roles";

/**
 * Gate for a capability.
 *
 * Returns a response to send when refused, so callers stay a single early
 * return. A null role is read as owner: an account whose role was never set
 * predates roles existing, and demoting it silently on deploy would lock
 * someone out of their own platform.
 */
export async function requireCapability(capability: Capability) {
  const account = await getUserAccount();

  if (!account?.is_admin) {
    return {
      account: null,
      response: Response.json({ error: "Not authorised" }, { status: 403 }),
    } as const;
  }

  const role = ((account.admin_role as AdminRole | null) ?? "owner") as AdminRole;

  if (!roleCan(role, capability)) {
    return {
      account,
      response: Response.json(
        {
          error: `Your role (${ROLE_LABELS[role] ?? role}) cannot do that.`,
          requiredCapability: capability,
        },
        { status: 403 }
      ),
    } as const;
  }

  return { account, role, response: null } as const;
}
