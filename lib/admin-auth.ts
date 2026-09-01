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
