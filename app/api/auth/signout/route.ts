import { NextResponse } from "next/server";

import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Signs out server-side.
 *
 * Done here rather than with a client-side signOut so the session cookies are
 * cleared by the server that set them. A client-only sign-out can leave an
 * httpOnly cookie in place, which looks like a successful logout right up
 * until the next page load quietly signs you back in.
 *
 * The impersonation cookie is cleared too — an admin signing out while viewing
 * as someone else must not return still wearing that hat.
 */
function clearImpersonation<T extends NextResponse>(response: T) {
  response.cookies.set("loopinglive_impersonating", "", { maxAge: 0, path: "/" });
  return response;
}

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return clearImpersonation(NextResponse.json({ ok: true }));
}

/** GET as well, so a plain link still works if JavaScript fails to load. */
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return clearImpersonation(NextResponse.redirect(new URL("/login", SITE.url)));
}
