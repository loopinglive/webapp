"use client";

import { Check, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Field, TextInput } from "@/components/admin/ui/Field";
import { useCertificateTemplate } from "@/hooks/useCertificateTemplate";

/**
 * The preview mirrors the actual renderer (app/api/certificate/[number]/image
 * route.tsx, a next/og ImageResponse) closely enough to judge colours and
 * copy before saving — it is CSS, not the same satori render, so treat it as
 * a close approximation rather than a pixel-perfect proof.
 */
export function CertificateTemplateEditor() {
  const { design, update, loading, saving, savedAt, error, save } = useCertificateTemplate();

  return (
    <>
      <PageHeader
        title="Certificate Design"
        subtitle="The one design every certificate you issue uses — colours, copy, and your signature."
      />

      <div className="grid gap-8 px-6 py-8 lg:grid-cols-[380px_1fr] lg:px-10">
        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <Field label="Headline">
                <TextInput value={design.headline} onChange={(e) => update("headline", e.target.value)} />
              </Field>
              <Field label="Subheadline" hint="Shown above the recipient's name">
                <TextInput value={design.subheadline} onChange={(e) => update("subheadline", e.target.value)} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Accent colour">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={design.accent_colour}
                      onChange={(e) => update("accent_colour", e.target.value)}
                      className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-surface-3 bg-transparent"
                    />
                    <TextInput value={design.accent_colour} onChange={(e) => update("accent_colour", e.target.value)} />
                  </div>
                </Field>
                <Field label="Background colour">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={design.background_colour}
                      onChange={(e) => update("background_colour", e.target.value)}
                      className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-surface-3 bg-transparent"
                    />
                    <TextInput
                      value={design.background_colour}
                      onChange={(e) => update("background_colour", e.target.value)}
                    />
                  </div>
                </Field>
              </div>

              <Field label="Signature name" hint="Optional — leave blank to hide the signature block">
                <TextInput
                  value={design.signature_name}
                  onChange={(e) => update("signature_name", e.target.value)}
                  placeholder="Jordan Ade"
                />
              </Field>
              <Field label="Signature title" hint="Optional">
                <TextInput
                  value={design.signature_title}
                  onChange={(e) => update("signature_title", e.target.value)}
                  placeholder="Founder, Loopinglive"
                />
              </Field>

              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-[13px] font-semibold text-white shadow-[0_10px_30px_-10px_#6C47FF] transition-colors hover:bg-accent-soft disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {saving ? "Saving…" : "Save design"}
                </button>
                {savedAt && !saving && (
                  <span className="flex items-center gap-1 text-[12px] text-[#00C851]">
                    <Check className="h-3.5 w-3.5" />
                    Saved
                  </span>
                )}
                {error && <span className="text-[12px] text-[#FF3B3B]">{error}</span>}
              </div>
            </div>

            <div className="flex items-start justify-center">
              <div
                className="flex aspect-[3/2] w-full max-w-[640px] flex-col items-center justify-center px-10 py-10 text-center"
                style={{
                  backgroundColor: design.background_colour,
                  border: `7px solid ${design.accent_colour}`,
                  color: "white",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {design.headline && (
                  <p className="text-[20px] font-bold">{design.headline}</p>
                )}
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: design.accent_colour }}
                >
                  {design.subheadline}
                </p>
                <p className="mt-3 text-[28px] font-bold">Alex Morgan</p>
                <p className="mt-4 text-[13px] opacity-75">has completed</p>
                <p className="mt-1.5 max-w-[80%] text-[17px] font-semibold">
                  Your Webinar Title Goes Here
                </p>
                <p className="mt-6 text-[10px] opacity-60">January 1, 2026</p>
                {design.signature_name && (
                  <div className="mt-6">
                    <p className="text-[12px] font-semibold">{design.signature_name}</p>
                    {design.signature_title && (
                      <p className="text-[10px] opacity-60">{design.signature_title}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
