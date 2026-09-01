/**
 * Third-party tracking, fired only when the host has supplied an ID.
 *
 * Nothing here loads or runs on a page whose config leaves the fields blank —
 * a webinar with no pixel configured ships no third-party script at all.
 */

type Config = {
  pixelId?: string | null;
  trackLeadEvent?: boolean;
  gaId?: string | null;
  trackConversion?: boolean;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackLead({
  pixelId,
  trackLeadEvent,
  gaId,
  trackConversion,
}: Config) {
  if (typeof window === "undefined") return;

  if (pixelId && trackLeadEvent && typeof window.fbq === "function") {
    window.fbq("track", "Lead");
  }

  if (gaId && trackConversion && typeof window.gtag === "function") {
    window.gtag("event", "conversion", { event_category: "registration" });
  }
}

/** Inline snippets injected by the page when an ID exists. */
export function facebookPixelSnippet(pixelId: string, pageView: boolean) {
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');${pageView ? `fbq('track','PageView');` : ""}`;
}

export function googleAnalyticsSnippet(gaId: string) {
  return `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${gaId}');`;
}
