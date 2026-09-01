"use client";

import { useState } from "react";
import { Check, ImageIcon, Upload } from "lucide-react";

import { VideoUploader } from "@/components/admin/webinar/VideoUploader";
import { Avatar } from "@/components/ui/Avatar";
import { PRESET_AVATARS } from "@/lib/preset-avatars";
import { cn } from "@/lib/utils";

/** Upload your own, or take one of the fifty that ship with the platform. */
export function PersonaAvatarUploader({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [tab, setTab] = useState<"presets" | "upload">("presets");

  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-3.5">
      <div className="flex items-center gap-3">
        <Avatar name={name || "?"} avatarUrl={value || null} size={48} />

        <div className="flex flex-1 items-center gap-1 rounded-full border border-[#2A2A3A] bg-[#1A1A2A] p-1">
          {[
            { id: "presets" as const, label: "Presets", icon: ImageIcon },
            { id: "upload" as const, label: "Upload", icon: Upload },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors",
                tab === option.id
                  ? "bg-[#6C47FF] text-white"
                  : "text-[#A0A0B0] hover:text-white"
              )}
            >
              <option.icon className="h-3.5 w-3.5" />
              {option.label}
            </button>
          ))}
        </div>

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-[11.5px] text-[#A0A0B0] transition-colors hover:text-[#FF3B3B]"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-3">
        {tab === "presets" ? (
          <div className="grid max-h-[168px] grid-cols-8 gap-2 overflow-y-auto pr-1 sm:grid-cols-10">
            {PRESET_AVATARS.map((preset, index) => {
              const selected = value === preset;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onChange(preset)}
                  aria-label={`Preset avatar ${index + 1}`}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-full transition-transform duration-150 hover:scale-110",
                    selected && "ring-2 ring-[#6C47FF] ring-offset-2 ring-offset-[#12121A]"
                  )}
                >
                  {/* Generated data URIs — no remote host to configure. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preset} alt="" className="h-full w-full object-cover" />
                  {selected && (
                    <span className="absolute inset-0 grid place-items-center bg-black/40">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <VideoUploader
            kind="image"
            target="avatar"
            existingLabel={value && !value.startsWith("data:") ? "Avatar set" : null}
            onComplete={(result) => onChange(result.url ?? "")}
          />
        )}
      </div>
    </div>
  );
}
