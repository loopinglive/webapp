"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, ExternalLink, Loader2 } from "lucide-react";

import { BuilderSidebar } from "@/components/registration-builder/BuilderSidebar";
import {
  MobilePreviewToggle,
  type PreviewDevice,
} from "@/components/registration-builder/MobilePreviewToggle";
import { MobileFrame } from "@/components/registration-builder/preview/MobileFrame";
import { RegistrationPagePreview } from "@/components/registration-builder/preview/RegistrationPagePreview";
import { Toggle } from "@/components/registration-builder/sections/Toggle";
import { useRegistrationBuilder } from "@/hooks/useRegistrationBuilder";
import { cn } from "@/lib/utils";

const SAVE_LABEL = {
  saved: "All changes saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Could not save",
} as const;

export function RegistrationPageBuilder({ webinarId }: { webinarId: string }) {
  const { config, updateConfig, saveStatus, loading, error } =
    useRegistrationBuilder(webinarId);
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  if (loading) {
    return (
      <div className="grid h-dvh place-items-center bg-[#0A0A0F]">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="grid h-dvh place-items-center bg-[#0A0A0F] px-6 text-center">
        <p className="text-[14px] text-[#A0A0B0]">
          {error ?? "Could not load the page settings."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0A0A0F]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#1E1E2E] px-5 py-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-white">
            Registration page
          </h1>
          <p
            className={cn(
              "flex items-center gap-1.5 text-[11.5px]",
              saveStatus === "error" ? "text-[#FF3B3B]" : "text-[#A0A0B0]"
            )}
          >
            {saveStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
            {saveStatus === "saved" && <Check className="h-3 w-3 text-[#00C851]" />}
            {saveStatus === "error" && <AlertCircle className="h-3 w-3" />}
            {SAVE_LABEL[saveStatus]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <MobilePreviewToggle device={device} onChange={setDevice} />

          <div className="rounded-full border border-[#2A2A3A] bg-[#1A1A2A] px-3.5 py-2">
            <Toggle
              label={config.is_active ? "Live" : "Offline"}
              checked={config.is_active}
              onChange={(value) => updateConfig({ is_active: value })}
            />
          </div>

          <Link
            href={`/webinar/${webinarId}/register`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#2A2A3A] px-3.5 text-[12.5px] text-[#A0A0B0] transition-colors hover:border-[#6C47FF]/60 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open live page
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <BuilderSidebar
          webinarId={webinarId}
          config={config}
          update={updateConfig}
        />

        {/* Preview */}
        <div
          className="min-w-0 flex-1 overflow-y-auto bg-[#1A1A2A] p-6"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {device === "mobile" ? (
            <MobileFrame>
              <RegistrationPagePreview config={config} compact />
            </MobileFrame>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#2A2A3A] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
              <RegistrationPagePreview config={config} />
            </div>
          )}

          {!config.is_active && (
            <p className="mx-auto mt-5 max-w-md rounded-lg bg-[#FF9500]/10 px-4 py-3 text-center text-[12px] text-[#FF9500]">
              This page is offline. Visitors see a “coming soon” message instead.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
