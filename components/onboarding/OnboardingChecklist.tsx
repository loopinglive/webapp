"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

export const ONBOARDING_STEPS = [
  {
    id: "create_webinar",
    title: "Create your first webinar",
    body: "Give it a title and a description. Everything else hangs off this.",
    href: "/admin/webinar/new",
    cta: "Create webinar",
  },
  {
    id: "upload_video",
    title: "Upload your video",
    body: "MP4, MOV or AVI. This is what your attendees will watch.",
    href: "/admin/dashboard",
    cta: "Upload",
  },
  {
    id: "add_personas",
    title: "Add chat personalities",
    body: "Three or more fake personas, so the room feels alive from the first second.",
    href: "/admin/dashboard",
    cta: "Add personas",
  },
  {
    id: "set_schedule",
    title: "Set your schedule",
    body: "Daily, weekly, or specific days — your webinar runs at these times.",
    href: "/admin/dashboard",
    cta: "Set schedule",
  },
  {
    id: "configure_offer",
    title: "Configure your offer",
    body: "What are you selling, and when should the button appear?",
    href: "/admin/dashboard",
    cta: "Set up offer",
  },
  {
    id: "publish",
    title: "Publish and go live",
    body: "Publish it, then share your registration link.",
    href: "/admin/dashboard",
    cta: "Publish",
  },
] as const;

type Progress = {
  stepsCompleted: string[];
  dismissed: boolean;
  completed: boolean;
};

/**
 * Setup progress in the sidebar.
 *
 * Derived from what actually exists — a webinar, a video, personas — rather
 * than from steps someone clicked through, so it stays honest if they build
 * things out of order or come back a week later.
 */
export function OnboardingChecklist() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/onboarding", { cache: "no-store" });
      if (response.ok) setProgress((await response.json()) as Progress);
    } catch {
      /* the checklist is not worth an error state */
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function dismiss() {
    setProgress((current) => (current ? { ...current, dismissed: true } : current));
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismiss: true }),
    });
  }

  // Gone entirely once finished — a permanently ticked checklist is clutter.
  if (!progress || progress.dismissed || progress.completed) return null;

  const done = progress.stepsCompleted.length;
  const total = ONBOARDING_STEPS.length;

  return (
    <div className="mx-3 mb-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-3">
      <button
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
          Setup
        </span>
        <span className="text-[11.5px] tabular-nums text-white">
          {done}/{total}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 text-[#6E6E80] transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#1A1A2A]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6C47FF] to-[#00D4FF] transition-[width] duration-500"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>

      {expanded && (
        <>
          <ul className="mt-3 space-y-1.5">
            {ONBOARDING_STEPS.map((step) => {
              const complete = progress.stepsCompleted.includes(step.id);
              return (
                <li key={step.id} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full",
                      complete ? "bg-[#00C851]" : "bg-[#2A2A3A]"
                    )}
                  >
                    {complete && <Check className="h-2 w-2 text-[#0A0A0F]" />}
                  </span>
                  <span
                    className={cn(
                      "text-[12px] leading-snug",
                      complete ? "text-[#6E6E80] line-through" : "text-[#C4C4D0]"
                    )}
                  >
                    {step.title}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            onClick={dismiss}
            className="mt-3 flex items-center gap-1.5 text-[11.5px] text-[#6E6E80] transition-colors hover:text-white"
          >
            <X className="h-3 w-3" />
            Hide this
          </button>
        </>
      )}
    </div>
  );
}

/** The full-screen version, shown on the first dashboard visit. */
export function OnboardingWizard({
  name,
  stepsCompleted,
  onClose,
}: {
  name: string;
  stepsCompleted: string[];
  onClose: () => void;
}) {
  const firstIncomplete = ONBOARDING_STEPS.findIndex(
    (step) => !stepsCompleted.includes(step.id)
  );
  const [index, setIndex] = useState(Math.max(0, firstIncomplete));

  const step = ONBOARDING_STEPS[index];
  const total = ONBOARDING_STEPS.length;

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-3xl border border-[#1E1E2E] bg-[#0D0D15] p-7">
        <div className="flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#1A1A2A]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6C47FF] to-[#00D4FF] transition-[width] duration-300"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-[11.5px] tabular-nums text-[#6E6E80]">
            {index + 1} of {total}
          </span>
        </div>

        {index === 0 && stepsCompleted.length === 0 && (
          <p className="mt-6 text-[13px] text-[#6C47FF]">Welcome, {name}</p>
        )}

        <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.025em] text-white">
          {step.title}
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-[#A0A0B0]">{step.body}</p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href={step.href}
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-full bg-[#6C47FF] px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#7C5AFF]"
          >
            {step.cta}
          </Link>

          {index > 0 && (
            <button
              onClick={() => setIndex((value) => value - 1)}
              className="h-10 px-2 text-[13px] text-[#A0A0B0] hover:text-white"
            >
              Back
            </button>
          )}
          {index < total - 1 && (
            <button
              onClick={() => setIndex((value) => value + 1)}
              className="h-10 px-2 text-[13px] text-[#A0A0B0] hover:text-white"
            >
              Next
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto h-10 text-[13px] text-[#6E6E80] hover:text-white"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
