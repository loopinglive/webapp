"use client";

import type { SectionProps } from "@/components/registration-builder/BuilderSidebar";
import { Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { VideoUploader } from "@/components/admin/webinar/VideoUploader";
import { Toggle } from "@/components/registration-builder/sections/Toggle";

const MAX_HEADLINE = 80;
const MAX_SUBHEADLINE = 150;

export function HeroSection({ config, update }: SectionProps) {
  return (
    <>
      <Field
        label="Headline"
        required
        hint={`${config.headline.length}/${MAX_HEADLINE}`}
        error={
          config.headline.length > MAX_HEADLINE
            ? "Shorten this to fit on one screen."
            : null
        }
      >
        <TextInput
          value={config.headline}
          onChange={(event) => update({ headline: event.target.value })}
          placeholder="Join our live training"
        />
      </Field>

      <Field
        label="Subheadline"
        hint={`${(config.subheadline ?? "").length}/${MAX_SUBHEADLINE}`}
      >
        <TextArea
          rows={3}
          value={config.subheadline ?? ""}
          onChange={(event) => update({ subheadline: event.target.value })}
          placeholder="What they will walk away with."
        />
      </Field>

      <Field label="Host name">
        <TextInput
          value={config.host_name ?? ""}
          onChange={(event) => update({ host_name: event.target.value })}
          placeholder="CC Mendel"
        />
      </Field>

      <Field label="Host title">
        <TextInput
          value={config.host_title ?? ""}
          onChange={(event) => update({ host_title: event.target.value })}
          placeholder="Founder of XYZ Academy"
        />
      </Field>

      <div>
        <span className="text-[12px] font-medium text-[#A0A0B0]">Host photo</span>
        <div className="mt-2">
          <VideoUploader
            kind="image"
            target="avatar"
            existingLabel={config.host_avatar_url ? "Photo set" : null}
            onComplete={(result) => update({ host_avatar_url: result.url ?? null })}
          />
        </div>
      </div>

      <Toggle
        label="Show the session date and time"
        checked={config.show_session_time}
        onChange={(value) => update({ show_session_time: value })}
      />
    </>
  );
}
