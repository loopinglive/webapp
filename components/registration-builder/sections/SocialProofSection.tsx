"use client";

import type { SectionProps } from "@/components/registration-builder/BuilderSidebar";
import { Field, TextInput } from "@/components/admin/ui/Field";
import { Toggle } from "@/components/registration-builder/sections/Toggle";

export function SocialProofSection({ config, update }: SectionProps) {
  return (
    <>
      <Field label="Starting number">
        <TextInput
          type="number"
          min={0}
          value={config.social_proof_count}
          onChange={(event) =>
            update({ social_proof_count: Math.max(0, Number(event.target.value)) })
          }
        />
      </Field>

      <Field label="Label">
        <TextInput
          value={config.social_proof_label}
          onChange={(event) => update({ social_proof_label: event.target.value })}
          placeholder="people have already registered"
        />
      </Field>

      <Toggle
        label="Add real registrations to the count"
        hint="Your starting number plus everyone who has actually signed up."
        checked={config.show_attendee_count}
        onChange={(value) => update({ show_attendee_count: value })}
      />
    </>
  );
}
