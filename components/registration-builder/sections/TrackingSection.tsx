"use client";

import type { SectionProps } from "@/components/registration-builder/BuilderSidebar";
import { Field, TextInput } from "@/components/admin/ui/Field";
import { Toggle } from "@/components/registration-builder/sections/Toggle";

export function TrackingSection({ config, update }: SectionProps) {
  return (
    <>
      <Field label="Facebook Pixel ID" hint="Events Manager">
        <TextInput
          value={config.facebook_pixel_id ?? ""}
          onChange={(event) => update({ facebook_pixel_id: event.target.value })}
          placeholder="1234567890123456"
        />
      </Field>

      {config.facebook_pixel_id && (
        <div className="space-y-3 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] p-3">
          <Toggle
            label="Fire PageView on load"
            checked={config.fb_track_pageview}
            onChange={(value) => update({ fb_track_pageview: value })}
          />
          <Toggle
            label="Fire Lead on registration"
            checked={config.fb_track_lead}
            onChange={(value) => update({ fb_track_lead: value })}
          />
        </div>
      )}

      <Field label="Google Analytics ID" hint="GA4">
        <TextInput
          value={config.google_analytics_id ?? ""}
          onChange={(event) => update({ google_analytics_id: event.target.value })}
          placeholder="G-XXXXXXXXXX"
        />
      </Field>

      {config.google_analytics_id && (
        <div className="rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] p-3">
          <Toggle
            label="Track registration as a conversion"
            checked={config.ga_track_conversion}
            onChange={(value) => update({ ga_track_conversion: value })}
          />
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-[#A0A0B0]">
        Scripts are only added to the page when an ID is set here. Leave these
        blank and nothing third-party loads.
      </p>
    </>
  );
}
