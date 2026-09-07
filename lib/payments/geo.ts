import "server-only";

/**
 * Country from the request, no external lookup needed.
 *
 * Vercel's edge network stamps this header on every request already — paying
 * for a MaxMind database or calling an IP-geolocation API would just be
 * re-deriving something the platform already tells us for free.
 */
export function countryFromRequest(request: Request): string | null {
  const header = request.headers.get("x-vercel-ip-country");
  return header && header !== "XX" ? header.toUpperCase() : null;
}
