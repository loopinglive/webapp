"use client";

import { createContext, useContext } from "react";
import { Loader2 } from "lucide-react";

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

/** Consistent section heading, with the autosave indicator. */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const { isSaving } = useSetupContext();

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
        {isSaving && (
          <span className="flex items-center gap-1.5 text-[11.5px] text-[#A0A0B0]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving
          </span>
        )}
        {action}
      </div>
    </div>
  );
}
