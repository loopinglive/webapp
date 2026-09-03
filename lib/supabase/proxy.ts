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
/*
 * Maintenance status, cached in the process.
 *
 * Read once every thirty seconds rather than on every request: the flag
 * changes about once a quarter and a database round trip in front of every
 * page load would be a real cost for a value that is almost always false.
 *
 * Thirty seconds is also the honest upper bound on how long it takes for
 * turning maintenance on to take effect, which is worth knowing when the
 * reason you are turning it on is urgent.
 */
let maintenanceCache: { at: number; enabled: boolean } | null = null;
const MAINTENANCE_TTL_MS = 30_000;

/** Paths that must answer even while the site is down. */
function alwaysServed(path: string) {
  return (
    // Uptime checks. A monitor that goes red during planned maintenance
    // teaches everyone to ignore it.
    path === "/api/health" ||
    path === "/maintenance" ||
    // The way back in, for whoever is doing the maintenance.
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/superadmin") ||
    path.startsWith("/api/superadmin") ||
    // Scheduled work must keep running; it is often the thing being waited on.
    path.startsWith("/api/cron") ||
    path.startsWith("/api/webhooks")
  );
}

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

  /*
   * Admin IP allowlist.
   *
   * Optional, and off until an owner turns it on — the default has to be
   * "everyone can reach it", or turning this on for the first time from an
   * office that has not yet been added would lock its own owner out with no
   * way back except a database console.
   *
   * Only the console itself, not the whole product: a customer-facing outage
   * from a misconfigured allowlist is a much worse failure than an admin
   * screen being briefly unreachable.
   */
  if (path.startsWith("/superadmin") || path.startsWith("/api/superadmin")) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");

    if (ip) {
      let allowed = true;
      try {
        const { data } = await supabase.rpc("admin_ip_allowed", { p_ip: ip });
        allowed = data !== false;
      } catch {
        // Unreachable config must not lock every admin out at once.
        allowed = true;
      }

      if (!allowed) {
        if (path.startsWith("/api/")) {
          return NextResponse.json(
            { error: "This address is not on the admin allowlist." },
            { status: 403 }
          );
        }
        // The console's existence is not something to advertise to a blocked
        // visitor any more than to a non-admin — same redirect either way.
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  /*
   * Maintenance mode.
   *
   * The environment variable wins and is checked first, because it is the
   * escape hatch: maintenance is most needed when something is badly wrong,
   * and a flag that lives in the database is unreadable in the one failure
   * that matters most — the database being the thing that is down.
   */
  if (!alwaysServed(path)) {
    let down = process.env.MAINTENANCE_MODE === "true";

    if (!down) {
      const fresh =
        maintenanceCache && Date.now() - maintenanceCache.at < MAINTENANCE_TTL_MS;

      if (fresh) {
        down = maintenanceCache!.enabled;
      } else {
        try {
          const { data } = await supabase.rpc("maintenance_status");
          const status = data as { enabled?: boolean } | null;
          down = Boolean(status?.enabled);
          maintenanceCache = { at: Date.now(), enabled: down };
        } catch {
          // Unreachable config is not a reason to take the site down. If the
          // database is genuinely gone the pages will fail on their own, with
          // better errors than a maintenance screen would give.
          maintenanceCache = { at: Date.now(), enabled: false };
        }
      }
    }

    if (down) {
      // An API caller wants a status code it can act on, not HTML.
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Down for maintenance.", maintenance: true },
          { status: 503, headers: { "Retry-After": "600" } }
        );
      }

      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      url.search = "";
      return NextResponse.rewrite(url, { status: 503 });
    }
  }

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
