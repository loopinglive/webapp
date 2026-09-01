"use client";

import type { SectionProps } from "@/components/registration-builder/BuilderSidebar";
import { Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { Toggle } from "@/components/registration-builder/sections/Toggle";

export function ThankYouSection({ config, update }: SectionProps) {
  return (
    <>
      <Field label="Headline">
        <TextInput
          value={config.thank_you_headline}
          onChange={(event) => update({ thank_you_headline: event.target.value })}
        />
      </Field>

      <Field label="Subheadline">
        <TextArea
          rows={2}
          value={config.thank_you_subheadline ?? ""}
          onChange={(event) =>
            update({ thank_you_subheadline: event.target.value })
          }
        />
      </Field>

      <Toggle
        label="Add to calendar buttons"
        checked={config.show_add_to_calendar}
        onChange={(value) => update({ show_add_to_calendar: value })}
      />

      <Toggle
        label="Social share buttons"
        checked={config.show_social_share}
        onChange={(value) => update({ show_social_share: value })}
      />

      <Field
        label="Redirect instead"
        hint="optional"
      >
        <TextInput
          type="url"
          value={config.thank_you_redirect_url ?? ""}
          onChange={(event) =>
            update({ thank_you_redirect_url: event.target.value })
          }
          placeholder="https://yoursite.com/thanks"
        />
      </Field>
      <p className="text-[11px] leading-relaxed text-[#A0A0B0]">
        If set, registrants see a five second countdown and are then sent here
        instead of seeing the thank you page.
      </p>
    </>
  );
}
