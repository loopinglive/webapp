"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Users } from "lucide-react";

import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { LocalTime } from "@/components/webinar/LocalTime";
import { useWebinarSession } from "@/hooks/useWebinarSession";
import { createClient } from "@/lib/supabase/client";
import { waitingRoomTopic } from "@/lib/realtime-broadcast";
import { cn } from "@/lib/utils";
import type { PublicJoiner } from "@/types";

/** Slow safety net behind the broadcast, and the source of the total. */
const RECONCILE_MS = 30_000;

export function WaitingRoom({ webinarId }: { webinarId: string }) {
  const router = useRouter();
  const { data, loading, error, clockOffsetMs } = useWebinarSession(webinarId);
  const [joiners, setJoiners] = useState<PublicJoiner[]>([]);
  const [waiting, setWaiting] = useState(0);
  const redirected = useRef(false);

  const watchUrl = `/webinar/${webinarId}/watch`;

  const goToWatch = useCallback(() => {
    if (redirected.current) return;
    redirected.current = true;
    router.push(watchUrl);
  }, [router, watchUrl]);

  // Already under way — do not make them wait for a countdown that has passed.
  useEffect(() => {
    if (data?.state === "live") goToWatch();
  }, [data?.state, goToWatch]);

  /**
   * Live joiners over Realtime broadcast.
   *
   * Not a postgres_changes subscription: registrants holds emails and phone
   * numbers, and subscribing to that table would hand every anonymous viewer
   * the whole row. The register route broadcasts a first name and a flag
   * instead, so the feed is instant and the PII never leaves the server.
   */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(waitingRoomTopic(webinarId))
      .on("broadcast", { event: "joined" }, ({ payload }) => {
        const joiner = (payload as { joiner?: PublicJoiner })?.joiner;
        if (!joiner) return;
        setJoiners((current) =>
          current.some((existing) => existing.id === joiner.id)
            ? current
            : [joiner, ...current].slice(0, 8)
        );
        setWaiting((count) => count + 1);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [webinarId]);

  // Initial state, plus a slow reconcile so a dropped broadcast cannot leave
  // the count drifting for the whole wait.
  useEffect(() => {
    const sessionId = data?.session?.id;
    let cancelled = false;

    const reconcile = async () => {
      const query = sessionId ? `?sessionId=${sessionId}` : "";
      try {
        const response = await fetch(
          `/api/webinar/${webinarId}/joiners${query}`,
          { cache: "no-store" }
        );
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          joiners: PublicJoiner[];
          waiting: number;
        };
        setJoiners(payload.joiners);
        setWaiting(payload.waiting);
      } catch {
        // Transient — the next tick retries.
      }
    };

    void reconcile();
    const id = setInterval(reconcile, RECONCILE_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [webinarId, data?.session?.id]);

  if (loading) {
    return (
      <Shell>
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <p className="text-[15px] text-[#A0A0B0]">
          {error ?? "This webinar is not available."}
        </p>
      </Shell>
    );
  }

  if (!data.session || data.state === "unscheduled" || data.state === "ended") {
    return (
      <Shell>
        <h1 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
          The next session is being scheduled
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#A0A0B0]">
          Check back soon — we will email you the moment a new time goes up.
        </p>
      </Shell>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0A0F]">
      <Ambience />

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-5 py-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#1E1E2E] bg-[#12121A]/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00D4FF] backdrop-blur-xl">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D4FF] opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00D4FF]" />
          </span>
          Waiting room
        </span>

        <h1 className="mt-7 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
          The webinar starts in…
        </h1>

        <CountdownTimer
          target={data.session.starts_at}
          clockOffsetMs={clockOffsetMs}
          onComplete={goToWatch}
          className="mt-10"
        />

        <p className="mt-8 text-[14.5px] text-[#A0A0B0]">
          Get ready — we go live{" "}
          <LocalTime
            iso={data.session.starts_at}
            className="text-white"
            fallback="shortly"
          />
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#1E1E2E] bg-[#12121A]/70 px-4 py-2 text-[13px] text-[#A0A0B0] backdrop-blur-xl">
          <Users className="h-3.5 w-3.5 text-[#6C47FF]" />
          <span className="tabular-nums text-white">
            {waiting.toLocaleString()}
          </span>
          {waiting === 1 ? "person is" : "people are"} waiting
        </div>

        {joiners.length > 0 && (
          <ul className="mt-9 flex w-full max-w-md flex-col gap-2">
            {joiners.slice(0, 5).map((joiner, index) => (
              <li
                key={joiner.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className={cn(
                  "flex animate-rise items-center justify-center gap-2 rounded-full",
                  "border border-[#1E1E2E] bg-[#12121A]/60 px-4 py-2 text-[13px] text-[#A0A0B0] backdrop-blur-xl"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#00C851]" />
                <span className="text-white">{joiner.fullName}</span>
                <span>{joiner.countryFlag}</span>
                <span>just joined</span>
              </li>
            ))}
          </ul>
        )}

        {data.webinar.description && (
          <div className="mt-12 max-w-lg rounded-xl border border-[#1E1E2E] bg-[#12121A]/60 px-6 py-5 backdrop-blur-xl">
            <h2 className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6C47FF]">
              <Sparkles className="h-3.5 w-3.5" />
              In this webinar
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[#A0A0B0]">
              {data.webinar.description}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0A0A0F] px-5 text-center">
      <Ambience />
      <div className="relative flex flex-col items-center">{children}</div>
    </main>
  );
}

function Ambience() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6C47FF]/18 blur-[160px] animate-drift" />
      <div className="absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-[#00D4FF]/10 blur-[150px] animate-drift [animation-delay:-7s]" />
      {/* Slow anticipation pulse. */}
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6C47FF]/15 animate-pulse-ring" />
    </div>
  );
}
