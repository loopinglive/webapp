import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { ImpersonationBanner } from "@/components/dashboard/ImpersonationBanner";
import { MobileBar } from "@/components/dashboard/MobileBar";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SecondFactorGate } from "@/components/superadmin/SecondFactorGate";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PlanProvider } from "@/hooks/usePlan";
import { hasPassedSecondFactor } from "@/lib/auth/second-factor";
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

  // Same gate as /superadmin's — replaces the dashboard rather than covering
  // it, and only for accounts that have actually turned 2FA on, so nobody
  // is locked out of a dashboard they never enrolled a second factor for.
  if (account.totp_enabled_at && !(await hasPassedSecondFactor(account.id))) {
    return <SecondFactorGate challengeUrl="/api/settings/2fa/challenge" />;
  }

  // A team that requires SSO does not get there by bouncing a password
  // login off the /login page — reaching the dashboard at all, by whatever
  // route, requires a live sso_sessions row. No row (or an expired one, e.g.
  // after a forced logout) sends them straight back through the IdP.
  if (account.team_id && !account.is_admin) {
    const service = createServiceClient();
    const { data: ssoConfig } = await service
      .from("sso_configurations")
      .select("require_sso")
      .eq("team_id", account.team_id)
      .eq("is_active", true)
      .maybeSingle();

    if (ssoConfig?.require_sso) {
      const { data: activeSession } = await service
        .from("sso_sessions")
        .select("id")
        .eq("team_id", account.team_id)
        .eq("user_id", account.id)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!activeSession) redirect(`/api/sso/initiate?teamId=${account.team_id}`);
    }
  }

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
          <div id="main-content" tabIndex={-1}>
            <ErrorBoundary area="dashboard">{children}</ErrorBoundary>
          </div>
        </div>
      </div>
    </PlanProvider>
  );
}
