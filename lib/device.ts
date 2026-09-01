export type DeviceType = "mobile" | "tablet" | "desktop";

export type DeviceInfo = {
  deviceType: DeviceType | null;
  browser: string | null;
  os: string | null;
};

/**
 * Enough of a user agent to answer "phone or laptop".
 *
 * Deliberately not a UA-parsing library: three coarse fields do not justify the
 * dependency, and the long tail of exotic browsers is noise in a breakdown
 * chart anyway. Anything unrecognised returns null rather than a guess — an
 * unknown and a wrong answer look the same on a pie chart, and only one of them
 * is honest.
 */
export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  if (!ua) return { deviceType: null, browser: null, os: null };

  const s = ua.toLowerCase();

  // Tablets first: every iPad and most Android tablets also say "mobile" or
  // match a phone pattern, so testing for phone first mislabels them.
  const deviceType: DeviceType = /ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)
    ? "tablet"
    : /mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)
      ? "mobile"
      : "desktop";

  // Order matters: Edge and Opera both claim Chrome, Chrome claims Safari.
  const browser = /edg\//.test(s)
    ? "Edge"
    : /opr\/|opera/.test(s)
      ? "Opera"
      : /samsungbrowser/.test(s)
        ? "Samsung Internet"
        : /firefox|fxios/.test(s)
          ? "Firefox"
          : /chrome|crios/.test(s)
            ? "Chrome"
            : /safari/.test(s)
              ? "Safari"
              : null;

  const os = /iphone|ipad|ipod|ios/.test(s)
    ? "iOS"
    : /android/.test(s)
      ? "Android"
      : /windows/.test(s)
        ? "Windows"
        : /mac os|macintosh/.test(s)
          ? "macOS"
          : /linux|x11/.test(s)
            ? "Linux"
            : null;

  return { deviceType, browser, os };
}

/**
 * Where the request actually came from, per the edge.
 *
 * Distinct from `registrants.country_code`, which is the country the attendee
 * chose for their phone number. They disagree often and mean different things,
 * so they are stored and charted separately.
 */
export function geoCountry(headers: Headers): string | null {
  const value =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    null;

  // "XX" and "T1" are the edge saying it does not know.
  if (!value || value === "XX" || value === "T1") return null;
  return value.toUpperCase();
}
