"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { BrandingPreview } from "@/components/white-label/BrandingPreview";
import { CustomDomainSetup } from "@/components/white-label/CustomDomainSetup";
import { SmtpConfig } from "@/components/white-label/SmtpConfig";
import { PricingCard } from "@/components/billing/PricingCard";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { PLANS } from "@/lib/billing/plans";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-medium text-[#D0D0DC]">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#1E1E2E] bg-[#1A1A24] px-3 py-2.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none";

export function WhiteLabelConfig() {
  const { form, update, save, verifyDomain, entitled, loading, saving, verifying, error, savedAt } =
    useWhiteLabel();
  const [smtpPassword, setSmtpPassword] = useState("");

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (!entitled) {
    return (
      <div className="px-6 py-8 lg:px-8">
        <div className="mb-8 rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-6 text-center">
          <h2 className="text-[18px] font-semibold text-white">White label is a Yearly/Lifetime feature</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-[#A0A0B0]">
            Remove all Loopinglive branding, connect your own domain, and send emails from your own
            address — available on the Yearly and Lifetime plans.
          </p>
        </div>
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {PLANS.filter((plan) => plan.slug === "yearly" || plan.slug === "lifetime").map((plan) => (
            <PricingCard key={plan.slug} plan={plan} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1fr_360px] lg:px-8">
      <div className="space-y-6">
        {/* Branding */}
        <section className="space-y-4 rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <h2 className="text-[15px] font-semibold text-white">Branding</h2>

          <Field label="Brand name">
            <input
              value={form.brand_name}
              onChange={(event) => update("brand_name", event.target.value)}
              placeholder="SalesAcademy Webinars"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Logo URL">
              <input
                value={form.brand_logo_url ?? ""}
                onChange={(event) => update("brand_logo_url", event.target.value || null)}
                placeholder="https://…/logo.png"
                className={inputClass}
              />
            </Field>
            <Field label="Favicon URL">
              <input
                value={form.brand_favicon_url ?? ""}
                onChange={(event) => update("brand_favicon_url", event.target.value || null)}
                placeholder="https://…/favicon.png"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["primary_colour", "Primary"],
                ["secondary_colour", "Secondary"],
                ["background_colour", "Background"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form[key]}
                    onChange={(event) => update(key, event.target.value)}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded border border-[#1E1E2E] bg-transparent p-0"
                  />
                  <input
                    value={form[key]}
                    onChange={(event) => update(key, event.target.value)}
                    className={inputClass}
                  />
                </div>
              </Field>
            ))}
          </div>

          <label className="flex items-center justify-between pt-2">
            <div>
              <p className="text-[13px] font-medium text-white">Remove Loopinglive branding</p>
              <p className="text-[12px] text-[#6E6E80]">
                No &quot;Powered by Loopinglive&quot; anywhere your attendees can see.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.hide_loopinglive_branding}
              onChange={(event) => update("hide_loopinglive_branding", event.target.checked)}
              className="h-5 w-9 shrink-0 accent-[#6C47FF]"
            />
          </label>
        </section>

        {/* Custom domain */}
        <section className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-white">Custom domain</h2>
          <CustomDomainSetup form={form} update={update} verifyDomain={verifyDomain} verifying={verifying} />
        </section>

        {/* Custom login page */}
        <section className="space-y-4 rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <h2 className="text-[15px] font-semibold text-white">Custom login page</h2>
          <Field label="Headline">
            <input
              value={form.custom_login_page_headline ?? ""}
              onChange={(event) => update("custom_login_page_headline", event.target.value || null)}
              placeholder="Welcome back"
              className={inputClass}
            />
          </Field>
          <Field label="Subheadline">
            <input
              value={form.custom_login_page_subheadline ?? ""}
              onChange={(event) => update("custom_login_page_subheadline", event.target.value || null)}
              placeholder="Sign in to access your webinars"
              className={inputClass}
            />
          </Field>
        </section>

        {/* Support */}
        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5 sm:grid-cols-3">
          <Field label="Support email">
            <input
              value={form.custom_support_email ?? ""}
              onChange={(event) => update("custom_support_email", event.target.value || null)}
              placeholder="support@yourbrand.com"
              className={inputClass}
            />
          </Field>
          <Field label="Terms URL">
            <input
              value={form.custom_terms_url ?? ""}
              onChange={(event) => update("custom_terms_url", event.target.value || null)}
              placeholder="https://…/terms"
              className={inputClass}
            />
          </Field>
          <Field label="Privacy URL">
            <input
              value={form.custom_privacy_url ?? ""}
              onChange={(event) => update("custom_privacy_url", event.target.value || null)}
              placeholder="https://…/privacy"
              className={inputClass}
            />
          </Field>
        </section>

        {/* Email */}
        <section className="space-y-4 rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <h2 className="text-[15px] font-semibold text-white">Email</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From name">
              <input
                value={form.email_from_name ?? ""}
                onChange={(event) => update("email_from_name", event.target.value || null)}
                placeholder="SalesAcademy"
                className={inputClass}
              />
            </Field>
            <Field label="From address">
              <input
                value={form.email_from_address ?? ""}
                onChange={(event) => update("email_from_address", event.target.value || null)}
                placeholder="hello@yourbrand.com"
                className={inputClass}
              />
            </Field>
          </div>
          <SmtpConfig form={form} update={update} onPasswordChange={setSmtpPassword} />
        </section>

        {error && <p className="text-[13px] text-[#FF5A5A]">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => save(smtpPassword)}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#6C47FF] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#7C57FF] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save changes
          </button>
          {savedAt && !saving && <span className="text-[12px] text-[#00C851]">Saved</span>}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <BrandingPreview form={form} />
      </div>
    </div>
  );
}
