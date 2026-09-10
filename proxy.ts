import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Hostnames that are ours. Anything else arriving here is a customer's own
 * domain and has to be resolved to whatever it fronts.
 */
function isPlatformHost(host: string): boolean {
  const name = host.split(":")[0].toLowerCase();
  return (
    name === "localhost" ||
    name === "127.0.0.1" ||
    name.endsWith(".vercel.app") ||
    name === "loopinglive.com" ||
    name.endsWith(".loopinglive.com")
  );
}

/**
 * Resolves a custom domain to the registration page it fronts.
 *
 * Done over PostgREST rather than the Supabase client because this runs in
 * the edge runtime on every request, and pulling the full client in for one
 * lookup costs more than the lookup does.
 *
 * Only reached for hostnames that are not ours, so ordinary traffic never
 * pays for it.
 */
async function resolveCustomDomain(host: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const name = host.split(":")[0].toLowerCase();

  try {
    const response = await fetch(
      `${url}/rest/v1/registration_page_config?custom_domain=eq.${encodeURIComponent(name)}&select=webinar_id&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        // Short-lived cache: a domain's destination changes about never, and
        // this is otherwise a database round trip in front of every request
        // on that domain.
        next: { revalidate: 60 },
      }
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as { webinar_id: string }[];
    return rows[0]?.webinar_id ?? null;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (!isPlatformHost(host)) {
    const { pathname } = request.nextUrl;

    // Leave the API and Next's own assets alone — a custom domain still needs
    // form posts and chunks to resolve normally.
    const passthrough =
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/webinar/");

    if (!passthrough) {
      const webinarId = await resolveCustomDomain(host);

      if (webinarId) {
        // The root of a connected domain is the registration page. Deeper
        // paths (thank-you, waiting room) are rewritten under the same
        // webinar so the customer's domain stays in the address bar for the
        // whole flow rather than bouncing to ours.
        const target = request.nextUrl.clone();
        target.pathname =
          pathname === "/" ? `/webinar/${webinarId}/register` : `/webinar/${webinarId}${pathname}`;
        return NextResponse.rewrite(target);
      }

      // A domain pointed here that we do not recognise. Saying so beats
      // serving the marketing site under someone else's brand.
      if (pathname === "/") {
        return new NextResponse(
          "This domain is not connected to a webinar yet. If you have just added the DNS record, it can take up to 48 hours.",
          { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } }
        );
      }
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)"],
};
