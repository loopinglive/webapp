"use client";

import type { WhiteLabelForm } from "@/hooks/useWhiteLabel";

/** A miniature live preview of the registration page, watch room, and email
 * header, updating as the host edits their branding. */
export function BrandingPreview({ form }: { form: WhiteLabelForm }) {
  const brand = form.brand_name || "Your Brand";

  return (
    <div className="rounded-2xl border border-[#1E1E2E] bg-[#0D0D17] p-5">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6E80]">
        Live preview
      </p>

      <div className="space-y-4">
        {/* Registration page */}
        <div
          className="overflow-hidden rounded-lg border border-[#1E1E2E]"
          style={{ backgroundColor: form.background_colour }}
        >
          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
            {form.brand_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.brand_logo_url} alt="" className="h-5 w-5 rounded object-cover" />
            ) : (
              <div
                className="h-5 w-5 rounded"
                style={{ backgroundColor: form.primary_colour }}
              />
            )}
            <span className="text-[11px] font-medium text-white">{brand}</span>
          </div>
          <div className="px-3 py-4">
            <div className="mb-2 h-2 w-2/3 rounded bg-white/10" />
            <div
              className="inline-block rounded px-3 py-1.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: form.primary_colour }}
            >
              Register Now
            </div>
          </div>
        </div>

        {/* Watch room header */}
        <div className="overflow-hidden rounded-lg border border-[#1E1E2E] bg-[#12121A]">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-medium text-white">{brand}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-black"
              style={{ backgroundColor: form.secondary_colour }}
            >
              LIVE
            </span>
          </div>
          <div className="aspect-video bg-black/60" />
        </div>

        {/* Email header */}
        <div className="overflow-hidden rounded-lg border border-[#1E1E2E] bg-white">
          <div
            className="px-3 py-2.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: form.primary_colour }}
          >
            {brand}
          </div>
          <div className="px-3 py-2 text-[10px] text-[#333]">
            From: {form.email_from_name || brand} &lt;{form.email_from_address || "hello@yourdomain.com"}&gt;
          </div>
        </div>
      </div>
    </div>
  );
}
