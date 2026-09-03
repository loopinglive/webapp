import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { ImpersonationBanner } from "@/components/dashboard/ImpersonationBanner";
import { MobileBar } from "@/components/dashboard/MobileBar";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PlanProvider } from "@/hooks/usePlan";
import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getUserAccount();
  if (!account) redirect("/login");

  // A suspended account is signed out of the product entirely rather than
  // shown a broken dashboard.
  if (account.is_suspended) redirect("/login?suspended=1");

  // Impersonation is a cookie read by admins only; anyone else forging it gets
  // nothing, because the name is only resolved when is_admin is true.
  let impersonating: string | null = null;
  if (account.is_admin) {
    const raw = (await cookies()).get("loopinglive_impersonating")?.value;
    if (raw) {
      try {
        const { userId } = JSON.parse(raw) as { userId?: string };
        if (userId) {
          const { data } = await createServiceClient()
            .from("user_accounts")
            .select("full_name, email")
            .eq("id", userId)
            .maybeSingle();
          impersonating = data?.full_name || data?.email || "another user";
        }
      } catch {
        /* a malformed cookie simply shows no banner */
      }
    }
  }

  return (
    <PlanProvider>
      <div className="flex min-h-screen bg-void">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <MobileBar />
          {impersonating && <ImpersonationBanner name={impersonating} />}
          <AnnouncementBanner />
          {/* Per-region containment: a page that throws costs the reader that
              page, not the sidebar and the banners with it. */}
          <ErrorBoundary area="dashboard">{children}</ErrorBoundary>
        </div>
      </div>
    </PlanProvider>
  );
}
