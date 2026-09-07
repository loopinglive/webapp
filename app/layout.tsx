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
  themeColor: "#0A0A0F",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
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
