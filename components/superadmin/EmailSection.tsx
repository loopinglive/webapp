"use client";

import { useState } from "react";

import { EmailGallery } from "@/components/admin/emails/EmailGallery";
import { EmailOperations } from "@/components/superadmin/EmailOperations";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "operations",
    label: "Delivery",
    note: "Is sending working, and what is failing.",
  },
  {
    id: "templates",
    label: "Templates",
    note: "All 50 platform emails, with a live preview and a test send.",
  },
] as const;

/**
 * Email, in one place.
 *
 * The template gallery already existed under the webinar admin, where a super
 * admin had no reason to look and no link to follow. Delivery is the half that
 * was missing: templates tell you what an email says, delivery tells you
 * whether it arrived.
 */
export function EmailSection() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("operations");

  return (
    <div>
      <div className="border-b border-[#1E1E2E] px-6 lg:px-8">
        <div className="flex gap-1">
          {TABS.map((option) => (
            <button
              key={option.id}
              onClick={() => setTab(option.id)}
              className={cn(
                "border-b-2 px-3 py-2.5 text-[13px] transition-colors",
                tab === option.id
                  ? "border-[#FF5A5A] text-white"
                  : "border-transparent text-[#A0A0B0] hover:text-white"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="px-6 pt-4 text-[12.5px] text-[#6E6E80] lg:px-8">
        {TABS.find((option) => option.id === tab)?.note}
      </p>

      {tab === "operations" ? (
        <div className="px-6 py-5 lg:px-8">
          <EmailOperations />
        </div>
      ) : (
        // The gallery brings its own full-height two-pane layout.
        <div className="mt-4">
          <EmailGallery />
        </div>
      )}
    </div>
  );
}
