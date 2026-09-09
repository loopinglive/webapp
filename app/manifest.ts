import type { MetadataRoute } from "next";

import { SITE } from "@/lib/constants";

/**
 * PWA manifest.
 *
 * Icons point at the dynamic ImageResponse route (app/api/pwa-icon), which
 * draws the brand mark at whatever size is requested — so there is one source
 * of geometry for the favicon, the touch icon and these, instead of a folder
 * of exported PNGs to keep in sync.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0A0A0F",
    theme_color: "#0A0A0F",
    icons: [
      { src: "/api/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/api/pwa-icon?size=192&maskable=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/api/pwa-icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
