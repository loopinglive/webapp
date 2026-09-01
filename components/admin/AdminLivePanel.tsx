"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { AdminChatFeed } from "@/components/admin/AdminChatFeed";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminStatsBar } from "@/components/admin/AdminStatsBar";
import { PersonaStatusBar } from "@/components/admin/PersonaStatusBar";
import { LocalTime } from "@/components/webinar/LocalTime";
import { useAdminLiveSession } from "@/hooks/useAdminLiveSession";
import { useAdminMessages } from "@/hooks/useAdminMessages";
import { usePersonaMode } from "@/hooks/usePersonaMode";

export function AdminLivePanel({ sessionId }: { sessionId: string }) {
  const { sessionData, loading, error } = useAdminLiveSession(sessionId);

  if (loading) {
    return (
      <Shell>
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </Shell>
    );
  }

  if (error || !sessionData) {
    return (
      <Shell>
        <p className="text-[15px] text-[#A0A0B0]">
          {error ?? "This session is not available."}
        </p>
      </Shell>
    );
  }

  return <Panel sessionId={sessionId} data={sessionData} />;
}

function Panel({
  sessionId,
  data,
}: {
  sessionId: string;
  data: NonNullable<ReturnType<typeof useAdminLiveSession>["sessionData"]>;
}) {
  const { personaModes, toggleMode, pendingId } = usePersonaMode({
    sessionId,
    initialModes: data.modes,
  });

  const {
    messages,
    allMessages,
    repliesByParent,
    filter,
    setFilter,
    search,
    setSearch,
    connected,
    stats,
  } = useAdminMessages({ webinarId: data.webinar.id, sessionId });

  const counts = useMemo(() => {
    const topLevel = allMessages.filter((message) => !message.reply_to_message_id);
    const real = topLevel.filter((message) => message.is_real_user);
    return {
      all: topLevel.length,
      real: real.length,
      unanswered: real.filter((message) => !message.has_ai_reply).length,
    };
  }, [allMessages]);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#0F0F1A]">
      <header className="shrink-0 border-b border-[#1E1E2E] px-4 py-3.5 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#1E1E2E] text-[#A0A0B0] transition-colors hover:border-[#6C47FF]/60 hover:text-white"
              aria-label="Back to admin"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6C47FF]">
                  Live session
                </span>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: connected ? "#00C851" : "#A0A0B0" }}
                />
              </div>
              <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">
                {data.webinar.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3B3B]/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#FF3B3B]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF3B3B] opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF3B3B]" />
              </span>
              Live
            </span>
            <LocalTime
              iso={data.session.starts_at}
              className="hidden text-[12px] text-[#A0A0B0] sm:block"
            />
          </div>
        </div>
      </header>

      <div className="shrink-0 px-4 py-4 lg:px-6">
        <AdminStatsBar
          webinarId={data.webinar.id}
          sessionId={sessionId}
          startsAt={data.session.starts_at}
          durationSeconds={data.webinar.video_duration_seconds ?? 0}
          total={stats.total}
          replied={stats.replied}
          pending={stats.pending}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 lg:flex-row lg:px-6">
        <aside className="shrink-0 lg:w-[280px]">
          <PersonaStatusBar
            personas={data.personas}
            personaModes={personaModes}
            onToggle={toggleMode}
            pendingId={pendingId}
          />
        </aside>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#1E1E2E] bg-[#12121A]/60 backdrop-blur-2xl">
          <div className="shrink-0 border-b border-[#1E1E2E] p-3">
            <AdminFilterBar
              filter={filter}
              onFilterChange={setFilter}
              search={search}
              onSearchChange={setSearch}
              counts={counts}
            />
          </div>

          <AdminChatFeed
            messages={messages}
            repliesByParent={repliesByParent}
            sessionId={sessionId}
            personas={data.personas}
            personaModes={personaModes}
          />
        </section>
      </div>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0F0F1A] px-5 text-center">
      <div className="flex flex-col items-center">{children}</div>
    </main>
  );
}
