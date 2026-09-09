"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Save } from "lucide-react";

import { WebinarSidebar } from "@/components/admin/webinar/WebinarSidebar";
import { useWebinarSetup } from "@/hooks/useWebinarSetup";

type SetupContext = ReturnType<typeof useWebinarSetup>;

const Context = createContext<SetupContext | null>(null);

/** Section pages read the shared webinar state instead of refetching it. */
export function useSetupContext() {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useSetupContext must be used inside WebinarSetupShell");
  }
  return context;
}

export function WebinarSetupShell({
  webinarId,
  children,
}: {
  webinarId: string;
  children: React.ReactNode;
}) {
  const setup = useWebinarSetup(webinarId);

  return (
    <Context.Provider value={setup}>
      <div className="flex min-h-dvh bg-[#0A0A0F]">
        <WebinarSidebar
          webinarId={webinarId}
          checklist={setup.checklist}
          status={setup.webinar?.status ?? "draft"}
          onPublished={setup.refresh}
        />

        <div className="min-w-0 flex-1">
          {setup.isLoading ? (
            <div className="grid h-dvh place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
            </div>
          ) : setup.error && !setup.webinar ? (
            <div className="grid h-dvh place-items-center px-6 text-center">
              <p className="text-[14px] text-[#A0A0B0]">{setup.error}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </Context.Provider>
  );
}

/**
 * Save state, and the button that settles it.
 *
 * Renders nothing until there is actually something to say — a page that
 * never edits the webinar (personas, comments, analytics) shows no save
 * control at all, rather than an inert button implying work is pending.
 */
export function SaveStatus() {
  const { isSaving, isDirty, lastSavedAt, saveNow, error } = useSetupContext();
  const [justSaved, setJustSaved] = useState(false);

  // "Saved" is worth holding on screen for a few seconds. A confirmation that
  // disappears as fast as the old spinner did would not have fixed anything.
  useEffect(() => {
    if (!lastSavedAt) return;
    const show = setTimeout(() => setJustSaved(true), 0);
    const hide = setTimeout(() => setJustSaved(false), 4000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [lastSavedAt]);

  if (error && isDirty) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-[11.5px] text-[#FF3B3B]">
          <AlertCircle className="h-3.5 w-3.5" />
          Not saved
        </span>
        <button
          onClick={() => void saveNow()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FF3B3B] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#FF5555]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isSaving) {
    return (
      <span className="flex items-center gap-1.5 text-[11.5px] text-[#A0A0B0]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="text-[11.5px] text-[#F5A623]">Unsaved changes</span>
        <button
          onClick={() => void saveNow()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#6C47FF] px-4 text-[12.5px] font-semibold text-white shadow-[0_8px_28px_-10px_#6C47FF] transition-colors hover:bg-[#7C5AFF]"
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
    );
  }

  if (justSaved) {
    return (
      <span className="flex items-center gap-1.5 text-[11.5px] text-[#00C851]">
        <Check className="h-3.5 w-3.5" />
        Saved
      </span>
    );
  }

  // Nothing pending and nothing recent: stay quiet. The shell is a layout that
  // survives navigation between sections, so a lingering "all saved" would
  // follow the host onto pages that never touched the webinar at all.
  return null;
}

/** Consistent section heading, with the save control. */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1E1E2E] px-6 py-6 lg:px-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] text-[#A0A0B0]">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <SaveStatus />
        {action}
      </div>
    </div>
  );
}
