import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { MobileBar } from "@/components/dashboard/MobileBar";
import { Sidebar } from "@/components/dashboard/sidebar";
import { HelpWidget } from "@/components/docs/HelpWidget";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PlanProvider } from "@/hooks/usePlan";
import { ThemeProvider } from "@/hooks/useTheme";

/**
 * The app shell, around the /admin pages that are part of the product.
 *
 * These three pages were unreachable-from and un-leavable: the sidebar's own
 * "Webinars" item points at /admin/dashboard, which lived under app/admin
 * with no layout, so following the most-used link in the menu made the menu
 * disappear. /admin/emails had no way back at all — the only exits were the
 * browser's back button and signing out.
 *
 * A route group rather than app/admin/layout.tsx, because a layout there
 * would also wrap /admin/webinar/[webinarId], which brings its own
 * full-height WebinarSidebar and would end up with two. Parenthesised
 * segments do not appear in the URL, so every path here is unchanged and no
 * existing link or bookmark breaks.
 *
 * Auth stays on the individual pages: each already checks the identity it
 * needs, and they do not agree — the webinar list admits any signed-in
 * customer, while the email gallery and platform analytics are operator-only.
 * Hoisting a single check up here would have to pick one and would silently
 * widen or narrow the other.
 */
export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <ThemeProvider>
        <div className="flex min-h-screen bg-void">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <MobileBar />
            <AnnouncementBanner />
            <div id="main-content" tabIndex={-1}>
              <ErrorBoundary area="dashboard">{children}</ErrorBoundary>
            </div>
          </div>
          <HelpWidget />
        </div>
      </ThemeProvider>
    </PlanProvider>
  );
}
