"use client";

import { useState } from "react";
import { Copy, Loader2, LogOut, ShieldOff } from "lucide-react";

import { SAMLSetup } from "@/components/security/SAMLSetup";
import { useToast } from "@/components/ui/ToastProvider";
import { useSSO } from "@/hooks/useSSO";

export function SSOConfiguration({ teamId }: { teamId: string }) {
  const { config, isEnterprise, loading, save, remove, forceLogout } = useSSO(teamId);
  const toast = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const metadataUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/sso/metadata?teamId=${teamId}` : "";
  const acsUrl = typeof window !== "undefined" ? `${window.location.origin}/api/sso/callback?teamId=${teamId}` : "";
  const entityId = typeof window !== "undefined" ? `${window.location.origin}/sso/${teamId}` : "";

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!isEnterprise) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <ShieldOff className="h-4 w-4 text-ink-faint" />
          Single sign-on
        </h2>
        <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-ink-muted">
          SSO is available on the Enterprise plan. Contact us to add it to
          this team.
        </p>
      </div>
    );
  }

  function copy(value: string, label: string) {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-ink">Your service provider details</h2>
        <p className="mt-1.5 text-[12.5px] text-ink-faint">
          Give these to whoever configures your identity provider.
        </p>
        <div className="mt-3 space-y-2">
          {[
            { label: "Entity ID", value: entityId },
            { label: "ACS URL", value: acsUrl },
            { label: "SP Metadata URL", value: metadataUrl },
          ].map((field) => (
            <div key={field.label} className="flex items-center justify-between gap-3 rounded-lg bg-void px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">{field.label}</p>
                <p className="truncate font-mono text-[12px] text-ink">{field.value}</p>
              </div>
              <button
                onClick={() => copy(field.value, field.label)}
                aria-label={`Copy ${field.label}`}
                className="shrink-0 text-ink-faint hover:text-ink"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-ink">Identity provider configuration</h2>
        <p className="mt-1.5 text-[12.5px] text-ink-faint">
          Okta, Azure AD, Google Workspace, OneLogin, Auth0, or any SAML 2.0
          compliant provider.
        </p>
        <div className="mt-4">
          <SAMLSetup existing={config} onSave={save} />
        </div>
      </div>

      {config && (
        <div className="rounded-2xl border border-hairline bg-surface p-5">
          <h2 className="text-[14px] font-semibold text-ink">Session management</h2>
          <p className="mt-1.5 max-w-[56ch] text-[12.5px] leading-relaxed text-ink-faint">
            Force everyone on this team to sign in through SSO again — useful
            when someone leaves. This does not immediately kill a session
            already open in someone&rsquo;s browser; it stops trusting it the
            next time anything checks.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                setLoggingOut(true);
                const count = await forceLogout();
                setLoggingOut(false);
                toast.success(`${count} session${count === 1 ? "" : "s"} expired.`);
              }}
              disabled={loggingOut}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline px-4 text-[12.5px] text-ink-muted transition-colors hover:border-[#FF5A5A]/40 hover:text-[#FF5A5A] disabled:opacity-40"
            >
              {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Force logout all SSO sessions
            </button>
            <button
              onClick={() => void remove()}
              className="inline-flex h-9 items-center rounded-full border border-hairline px-4 text-[12.5px] text-ink-muted hover:text-ink"
            >
              Disable SSO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
