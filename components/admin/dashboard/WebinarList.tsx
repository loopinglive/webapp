"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Video } from "lucide-react";

import { DashboardHeader } from "@/components/admin/dashboard/DashboardHeader";
import { WebinarCard } from "@/components/admin/dashboard/WebinarCard";
import type { WebinarSummary } from "@/types";

type Totals = {
  webinars: number;
  registrants: number;
  attendees: number;
  buyers: number;
};

export function WebinarList({
  adminEmail,
  isPlatformAdmin = false,
}: {
  adminEmail: string | null;
  isPlatformAdmin?: boolean;
}) {
  const [webinars, setWebinars] = useState<WebinarSummary[]>([]);
  const [totals, setTotals] = useState<Totals>({
    webinars: 0,
    registrants: 0,
    attendees: 0,
    buyers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/admin/webinars", { cache: "no-store" });
        const payload = (await response.json()) as {
          webinars: WebinarSummary[];
          totals: Totals;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok) {
          setError(payload.error ?? "Could not load your webinars.");
          return;
        }
        setWebinars(payload.webinars);
        setTotals(payload.totals);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-dvh bg-void">
      <DashboardHeader adminEmail={adminEmail} totals={totals} isPlatformAdmin={isPlatformAdmin} />

      <div className="px-5 py-8 lg:px-10">
        {loading ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : error ? (
          <p className="py-24 text-center text-[14px] text-ink-muted">{error}</p>
        ) : webinars.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {webinars.map((webinar) => (
              <WebinarCard key={webinar.id} webinar={webinar} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-dashed border-surface-3 px-8 py-20 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/12">
        <Video className="h-6 w-6 text-accent" />
      </div>
      <h2 className="mt-6 text-[20px] font-semibold tracking-[-0.02em] text-ink">
        Your first webinar starts here
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-ink-muted">
        Upload a recording, script the room, and let it run on a schedule.
      </p>
      <Link
        href="/admin/webinar/new"
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[14px] font-semibold text-white shadow-[0_12px_36px_-10px_#6C47FF] transition-all duration-200 hover:bg-accent-soft"
      >
        <Plus className="h-4 w-4" />
        Create your first webinar
      </Link>
    </div>
  );
}
