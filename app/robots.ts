import type { MetadataRoute } from "next";

import { SITE } from "@/lib/constants";

/**
 * Crawl rules.
 *
 * Registration and watch pages stay crawlable — a host's registration link is
 * marketing and they may well want it indexed. Everything behind a login, and
 * every per-person link, is disallowed: a replay URL carries an access token,
 * and an indexed one would be a data leak, not a traffic win.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/superadmin",
        "/settings",
        "/upgrade",
        "/api/",
        "/replay/",
        "/offer/",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
