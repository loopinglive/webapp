import type { MetadataRoute } from "next";

import { SITE } from "@/lib/constants";

/**
 * Next's native sitemap, served at /sitemap.xml.
 *
 * The spec called for /api/sitemap plus a rewrite. This is the same output
 * with no rewrite to keep in step, and Next handles the XML and content type.
 * Only public pages are listed — anything behind auth has no business in a
 * search index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE.url, priority: 1, changeFrequency: "weekly", lastModified: now },
    { url: `${SITE.url}/pricing`, priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${SITE.url}/signup`, priority: 0.8, changeFrequency: "monthly", lastModified: now },
    { url: `${SITE.url}/docs/api`, priority: 0.7, changeFrequency: "monthly", lastModified: now },
    { url: `${SITE.url}/terms`, priority: 0.4, changeFrequency: "yearly", lastModified: now },
    { url: `${SITE.url}/privacy`, priority: 0.4, changeFrequency: "yearly", lastModified: now },
    { url: `${SITE.url}/login`, priority: 0.3, changeFrequency: "yearly", lastModified: now },
  ];
}
