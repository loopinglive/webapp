import { createClient } from "@/lib/supabase/server";

export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

/**
 * The admin identity check, always against the Supabase session on the server.
 *
 * NEXT_PUBLIC_ADMIN_EMAIL is readable in the browser, which is fine — it names
 * who the admin is, it does not authorise anyone. Authorisation is the signed
 * session cookie, verified here on every admin route.
 */
export async function getAdminUser() {
  if (!ADMIN_EMAIL) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return null;

  return user;
}

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) {
    return {
      user: null,
      response: Response.json({ error: "Not authorised" }, { status: 403 }),
    } as const;
  }
  return { user, response: null } as const;
}

/**
 * Accepts either admin identity.
 *
 * There are two gates in the product for historical reasons: the webinar admin
 * checks NEXT_PUBLIC_ADMIN_EMAIL against the session, and the super admin panel
 * checks user_accounts.is_admin. Platform-level tools — the email gallery, for
 * one — belong to both, and a super admin being refused a page they own is a
 * worse outcome than a slightly wider gate.
 *
 * Imported lazily so this module stays usable from routes that have no reason
 * to pull in the billing layer.
 */
export async function requireAnyAdmin() {
  const user = await getAdminUser();
  if (user) return { user, response: null } as const;

  const { getUserAccount } = await import("@/lib/billing/account");
  const account = await getUserAccount();

  if (account?.is_admin) {
    return {
      user: { id: account.id, email: account.email },
      response: null,
    } as const;
  }

  return {
    user: null,
    response: Response.json({ error: "Not authorised" }, { status: 403 }),
  } as const;
}
