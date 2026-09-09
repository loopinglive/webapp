import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { SITE } from "@/lib/constants";

import "./globals.css";
import { AccessibilityMenu } from "@/components/accessibility/AccessibilityMenu";
import { SkipToContent } from "@/components/accessibility/SkipToContent";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "webinar platform",
    "automated webinar",
    "evergreen webinar",
    "fake live webinar",
    "webinar software",
    "webinar funnel",
  ],
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE.name,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0F" },
    { media: "(prefers-color-scheme: light)", color: "#F6F6F9" },
  ],
  colorScheme: "dark light",
};

/*
 * Applied before first paint.
 *
 * The theme lives in localStorage, which React cannot read until it hydrates —
 * so without this the page paints dark and then snaps to light, which is worse
 * than not offering the choice. Kept deliberately tiny and dependency-free
 * because it blocks rendering, and it mirrors the same default as
 * hooks/useTheme.tsx: dark unless something else was chosen.
 */
const NO_FLASH_THEME = `(function(){try{var c=localStorage.getItem("loopinglive-theme");var t=c==="light"||c==="dark"?c:c==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):"dark";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="bg-void text-ink antialiased">
        <SkipToContent />
        <ToastProvider>
          {children}
          <InstallPrompt />
          <AccessibilityMenu />
        </ToastProvider>
        {process.env.NODE_ENV === "production" && <ServiceWorkerRegister />}
      </body>
    </html>
  );
}
