"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { BrandingSection } from "@/components/registration-builder/sections/BrandingSection";
import { CustomDomainSection } from "@/components/registration-builder/sections/CustomDomainSection";
import { FormFieldsSection } from "@/components/registration-builder/sections/FormFieldsSection";
import { HeroSection } from "@/components/registration-builder/sections/HeroSection";
import { SocialProofSection } from "@/components/registration-builder/sections/SocialProofSection";
import { ThankYouSection } from "@/components/registration-builder/sections/ThankYouSection";
import { TrackingSection } from "@/components/registration-builder/sections/TrackingSection";
import { WhatYouWillLearnSection } from "@/components/registration-builder/sections/WhatYouWillLearnSection";
import { cn } from "@/lib/utils";
import type { RegistrationConfig } from "@/types";

export type SectionProps = {
  config: RegistrationConfig;
  update: (patch: Partial<RegistrationConfig>) => void;
};

export function BuilderSidebar({
  webinarId,
  config,
  update,
}: SectionProps & { webinarId: string }) {
  const [open, setOpen] = useState<string | null>("branding");

  const sections = [
    { id: "branding", label: "Branding", render: () => <BrandingSection config={config} update={update} /> },
    { id: "hero", label: "Hero content", render: () => <HeroSection config={config} update={update} /> },
    { id: "learn", label: "What you'll learn", render: () => <WhatYouWillLearnSection config={config} update={update} /> },
    { id: "social", label: "Social proof", render: () => <SocialProofSection config={config} update={update} /> },
    { id: "fields", label: "Form fields", render: () => <FormFieldsSection config={config} update={update} /> },
    { id: "thanks", label: "Thank you page", render: () => <ThankYouSection config={config} update={update} /> },
    { id: "tracking", label: "Tracking", render: () => <TrackingSection config={config} update={update} /> },
    { id: "domain", label: "Custom domain", render: () => <CustomDomainSection webinarId={webinarId} config={config} update={update} /> },
  ];

  return (
    <aside className="w-[380px] shrink-0 overflow-y-auto border-r border-[#1E1E2E] bg-[#0D0D17]">
      {sections.map((section) => {
        const expanded = open === section.id;
        return (
          <section key={section.id} className="border-b border-[#1E1E2E]">
            <button
              onClick={() => setOpen(expanded ? null : section.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left text-[13px] font-medium transition-colors",
                expanded ? "text-white" : "text-[#A0A0B0] hover:text-white"
              )}
            >
              {section.label}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </button>
            {expanded && <div className="space-y-4 px-5 pb-5">{section.render()}</div>}
          </section>
        );
      })}
    </aside>
  );
}
