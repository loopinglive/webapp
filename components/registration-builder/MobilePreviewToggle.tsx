"use client";

import { Monitor, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";

export type PreviewDevice = "desktop" | "mobile";

export function MobilePreviewToggle({
  device,
  onChange,
}: {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-[#2A2A3A] bg-[#1A1A2A] p-1">
      {[
        { id: "desktop" as const, label: "Desktop", icon: Monitor },
        { id: "mobile" as const, label: "Mobile", icon: Smartphone },
      ].map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors duration-200",
            device === option.id
              ? "bg-[#6C47FF] text-white"
              : "text-[#A0A0B0] hover:text-white"
          )}
        >
          <option.icon className="h-3.5 w-3.5" />
          {option.label}
        </button>
      ))}
    </div>
  );
}
