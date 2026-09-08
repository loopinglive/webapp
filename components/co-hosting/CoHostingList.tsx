"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";

type CoHosting = {
  id: string;
  webinar_id: string;
  permissions: { chat: boolean; moderate: boolean; offers: boolean; analytics: boolean };
  accepted_at: string | null;
  webinars: { title: string; status: string } | null;
};

const PERMISSION_LABELS: Record<string, string> = {
  chat: "Live chat",
  moderate: "Moderate",
  offers: "Offer control",
  analytics: "Analytics",
};

/** Webinars this account co-hosts — someone else's, so they never show in the main webinar list. */
export function CoHostingList() {
  const [rows, setRows] = useState<CoHosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch("/api/co-hosts/mine", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { coHosting?: CoHosting[] } | null) => setRows(payload?.coHosting ?? []))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent-soft">
          <Users className="h-4 w-4" />
        </span>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Co-hosting</h1>
      </div>
      <p className="mt-2 text-[13px] text-ink-muted">Webinars other hosts have invited you to help run.</p>

      <div className="mt-7 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-[12.5px] text-ink-faint">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-[12.5px] text-ink-faint">
            No co-hosting invitations yet. A host invites you by email, and it appears here once you accept.
          </p>
        ) : (
          rows.map((row) => {
            const granted = Object.entries(row.permissions ?? {})
              .filter(([, value]) => value)
              .map(([key]) => PERMISSION_LABELS[key] ?? key);

            return (
              <Link
                key={row.id}
                href={`/webinar/${row.webinar_id}/watch`}
                className="block rounded-xl border border-hairline bg-surface px-4 py-3.5 transition-colors hover:border-accent/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[13.5px] text-ink">{row.webinars?.title ?? "Untitled webinar"}</span>
                  <span className="shrink-0 text-[11px] text-ink-faint">{row.webinars?.status}</span>
                </div>
                <p className="mt-1 text-[11.5px] text-ink-faint">{granted.join(" · ") || "No permissions"}</p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
