import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The CSP is the fiddly one. Notes on why each allowance is here, so nobody
 * has to reverse-engineer it later:
 *
 * - 'unsafe-inline' and 'unsafe-eval' in script-src: Next's App Router inlines
 *   hydration bootstrap scripts, and the dev overlay evaluates. Removing these
 *   needs per-request nonces threaded through the proxy — worth doing, but it
 *   is a change with its own failure modes, not a one-line tightening.
 * - blob: in media-src and img-src: the video player and Cloudinary's direct
 *   upload both create object URLs.
 * - Supabase over both https and wss: realtime chat is a WebSocket.
 * - frame-ancestors 'self' rather than X-Frame-Options alone, because the
 *   admin email preview renders in a sandboxed iframe on our own origin.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://www.facebook.com https://www.google-analytics.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "connect-src 'self' https://api.stripe.com https://api.cloudinary.com https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com",
  "frame-src 'self' https://js.stripe.com https://calendly.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        // Everything except Next's own immutable static assets, which are
        // already hashed and do not benefit from these.
        source: "/((?!_next/static).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
