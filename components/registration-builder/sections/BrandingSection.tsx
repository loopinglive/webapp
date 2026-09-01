"use client";

import type { SectionProps } from "@/components/registration-builder/BuilderSidebar";
import { ColourPicker } from "@/components/admin/ui/ColourPicker";
import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { VideoUploader } from "@/components/admin/webinar/VideoUploader";
import { cn } from "@/lib/utils";

const BACKGROUNDS = [
  { id: "dark", label: "Dark" },
  { id: "solid", label: "Solid" },
  { id: "gradient", label: "Gradient" },
  { id: "image", label: "Image" },
] as const;

const GRADIENT_ANGLES = ["135deg", "90deg", "180deg", "45deg"];

export function BrandingSection({ config, update }: SectionProps) {
  // Gradients are stored as one CSS string; these pull the pieces back out so
  // the pickers have something to bind to.
  const stops = config.background_value.match(/#[0-9a-f]{3,8}/gi) ?? [
    "#0A0A0F",
    "#1A0A2E",
  ];
  const angle = config.background_value.match(/(\d+deg)/)?.[1] ?? "135deg";

  const setGradient = (from: string, to: string, deg: string) =>
    update({ background_value: `linear-gradient(${deg}, ${from} 0%, ${to} 100%)` });

  return (
    <>
      <div>
        <span className="text-[12px] font-medium text-[#A0A0B0]">Logo</span>
        <div className="mt-2">
          {config.logo_url ? (
            <div className="flex items-center gap-3 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.logo_url} alt="" className="h-8 max-w-[140px] object-contain" />
              <AdminButton
                variant="ghost"
                className="ml-auto"
                onClick={() => update({ logo_url: null })}
              >
                Remove
              </AdminButton>
            </div>
          ) : (
            <VideoUploader
              kind="image"
              target="avatar"
              onComplete={(result) => update({ logo_url: result.url ?? null })}
            />
          )}
        </div>
      </div>

      <div>
        <span className="text-[12px] font-medium text-[#A0A0B0]">Primary colour</span>
        <div className="mt-2">
          <ColourPicker
            value={config.primary_colour}
            onChange={(colour) => update({ primary_colour: colour })}
          />
        </div>
      </div>

      <div>
        <span className="text-[12px] font-medium text-[#A0A0B0]">Secondary colour</span>
        <div className="mt-2">
          <ColourPicker
            value={config.secondary_colour}
            onChange={(colour) => update({ secondary_colour: colour })}
          />
        </div>
      </div>

      <div>
        <span className="text-[12px] font-medium text-[#A0A0B0]">Background</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {BACKGROUNDS.map((option) => (
            <button
              key={option.id}
              onClick={() => update({ background_type: option.id })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                config.background_type === option.id
                  ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                  : "border-[#2A2A3A] text-[#A0A0B0] hover:text-white"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {config.background_type === "solid" && (
          <div className="mt-3">
            <ColourPicker
              value={stops[0]}
              onChange={(colour) => update({ background_value: colour })}
            />
          </div>
        )}

        {config.background_type === "gradient" && (
          <div className="mt-3 space-y-3">
            <ColourPicker
              value={stops[0]}
              onChange={(colour) => setGradient(colour, stops[1] ?? "#1A0A2E", angle)}
            />
            <ColourPicker
              value={stops[1] ?? "#1A0A2E"}
              onChange={(colour) => setGradient(stops[0], colour, angle)}
            />
            <div className="flex gap-1.5">
              {GRADIENT_ANGLES.map((deg) => (
                <button
                  key={deg}
                  onClick={() => setGradient(stops[0], stops[1] ?? "#1A0A2E", deg)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11.5px] transition-colors",
                    angle === deg
                      ? "border-[#6C47FF] text-white"
                      : "border-[#2A2A3A] text-[#A0A0B0]"
                  )}
                >
                  {deg}
                </button>
              ))}
            </div>
          </div>
        )}

        {config.background_type === "image" && (
          <div className="mt-3 space-y-2">
            <VideoUploader
              kind="image"
              target="avatar"
              existingLabel={config.background_value.startsWith("http") ? "Image set" : null}
              onComplete={(result) => update({ background_value: result.url ?? "" })}
            />
            <Field label="Or paste an image URL">
              <TextInput
                value={config.background_value.startsWith("http") ? config.background_value : ""}
                onChange={(event) => update({ background_value: event.target.value })}
                placeholder="https://…"
              />
            </Field>
          </div>
        )}
      </div>
    </>
  );
}
