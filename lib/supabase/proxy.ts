import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Route protection and referral capture.
 *
 * Deliberately shallow: it refreshes the Supabase session and turns anonymous
 * visitors away from private areas. Plan and admin checks are NOT made here —
 * the proxy runs without the service role, so it cannot read user_accounts.
 * Those decisions live in the layouts and API routes, where they can be
 * enforced rather than merely redirected.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // A ?ref= on any page starts the 30-day attribution window, so someone who
  // browses for a week before signing up is still credited to the affiliate.
  const ref = request.nextUrl.searchParams.get("ref");
  const setReferral = (target: NextResponse) => {
    if (ref && /^[a-z0-9]{4,32}$/i.test(ref)) {
      target.cookies.set("loopinglive_ref", ref, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
      });
    }
    return target;
  };

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/webinars") ||
    path.startsWith("/attendees") ||
    path.startsWith("/analytics") ||
    path.startsWith("/automations") ||
    path.startsWith("/integrations") ||
    path.startsWith("/billing") ||
    path.startsWith("/settings") ||
    path.startsWith("/upgrade") ||
    path.startsWith("/superadmin") ||
    path.startsWith("/admin");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return setReferral(NextResponse.redirect(url));
  }

  return setReferral(response);
}
