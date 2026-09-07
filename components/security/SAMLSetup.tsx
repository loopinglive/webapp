"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import type { SsoConfig } from "@/hooks/useSSO";

const PROVIDERS = [
  { value: "okta", label: "Okta" },
  { value: "azure_ad", label: "Microsoft Azure AD" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "onelogin", label: "OneLogin" },
  { value: "auth0", label: "Auth0" },
  { value: "custom", label: "Custom SAML 2.0" },
] as const;

/** The IdP-side configuration form: SSO URL, certificate, and attribute mapping. */
export function SAMLSetup({
  existing,
  onSave,
}: {
  existing: SsoConfig | null;
  onSave: (input: {
    provider: string;
    entityId?: string;
    ssoUrl: string;
    certificate: string;
    attributeMapping?: Record<string, string>;
    requireSso: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const toast = useToast();
  const [provider, setProvider] = useState(existing?.provider ?? "okta");
  const [entityId, setEntityId] = useState(existing?.entity_id ?? "");
  const [ssoUrl, setSsoUrl] = useState(existing?.sso_url ?? "");
  const [certificate, setCertificate] = useState("");
  const [emailAttr, setEmailAttr] = useState(existing?.attribute_mapping?.email ?? "email");
  const [firstNameAttr, setFirstNameAttr] = useState(existing?.attribute_mapping?.firstName ?? "firstName");
  const [lastNameAttr, setLastNameAttr] = useState(existing?.attribute_mapping?.lastName ?? "lastName");
  const [roleAttr, setRoleAttr] = useState(existing?.attribute_mapping?.role ?? "role");
  const [requireSso, setRequireSso] = useState(existing?.require_sso ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!ssoUrl.trim() || !certificate.trim()) {
      setError("The IdP SSO URL and certificate are both required.");
      return;
    }

    setSaving(true);
    const result = await onSave({
      provider,
      entityId: entityId.trim() || undefined,
      ssoUrl: ssoUrl.trim(),
      certificate: certificate.trim(),
      attributeMapping: {
        email: emailAttr.trim() || "email",
        firstName: firstNameAttr.trim() || "firstName",
        lastName: lastNameAttr.trim() || "lastName",
        role: roleAttr.trim() || "role",
      },
      requireSso,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Could not save that configuration.");
      return;
    }
    toast.success("SSO configuration saved.");
    setCertificate("");
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-[12.5px] text-ink-muted">Identity provider</span>
        <select
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {PROVIDERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[12.5px] text-ink-muted">IdP Entity ID (optional)</span>
        <input
          value={entityId}
          onChange={(event) => setEntityId(event.target.value)}
          placeholder="https://your-idp.com/entity"
          className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <label className="block">
        <span className="text-[12.5px] text-ink-muted">IdP SSO URL</span>
        <input
          value={ssoUrl}
          onChange={(event) => setSsoUrl(event.target.value)}
          placeholder="https://your-idp.com/sso/saml"
          className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <label className="block">
        <span className="text-[12.5px] text-ink-muted">
          X.509 certificate {existing && <span className="text-ink-faint">— leave blank to keep the current one</span>}
        </span>
        <textarea
          value={certificate}
          onChange={(event) => setCertificate(event.target.value)}
          rows={5}
          placeholder="-----BEGIN CERTIFICATE-----"
          className="mt-1.5 w-full resize-none rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-[11.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <div>
        <span className="text-[12.5px] text-ink-muted">Attribute mapping</span>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {[
            { label: "Email attribute", value: emailAttr, set: setEmailAttr },
            { label: "First name attribute", value: firstNameAttr, set: setFirstNameAttr },
            { label: "Last name attribute", value: lastNameAttr, set: setLastNameAttr },
            { label: "Role attribute", value: roleAttr, set: setRoleAttr },
          ].map((field) => (
            <input
              key={field.label}
              value={field.value}
              onChange={(event) => field.set(event.target.value)}
              placeholder={field.label}
              className="h-9 rounded-lg border border-hairline bg-surface px-3 text-[12.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3.5">
        <span>
          <span className="block text-[13px] text-ink">Require SSO for this team</span>
          <span className="mt-0.5 block text-[11.5px] text-ink-faint">
            Turns off password login for every member — enable this only once
            SSO is confirmed working.
          </span>
        </span>
        <input
          type="checkbox"
          checked={requireSso}
          onChange={(event) => setRequireSso(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-accent"
        />
      </label>

      {error && <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save configuration
      </button>
    </div>
  );
}
