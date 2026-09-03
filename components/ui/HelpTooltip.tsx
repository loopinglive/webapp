"use client";

import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A question mark that explains a non-obvious control.
 *
 * Opens on hover and on focus, and is reachable by keyboard — a tooltip that
 * only responds to a mouse is invisible to anyone tabbing through a form, and
 * unusable on touch.
 */
export function HelpTooltip({
  content,
  position = "top",
  className,
}: {
  content: string;
  position?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const placement = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[position];

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label="More information"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        className="text-[#6E6E80] transition-colors hover:text-[#A0A0B0] focus:text-[#A0A0B0] focus:outline-none"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "absolute z-50 w-[220px] rounded-lg border border-[#2A2A3A] bg-[#1A1A26] px-3 py-2 text-[12px] font-normal leading-relaxed text-[#D4D4DE] shadow-xl",
            placement
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
