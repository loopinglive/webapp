"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: string;
};

const TONE: Record<string, { colour: string; background: string }> = {
  info: { colour: "#00D4FF", background: "rgba(0,212,255,.10)" },
  success: { colour: "#00C851", background: "rgba(0,200,81,.10)" },
  warning: { colour: "#FFB020", background: "rgba(255,176,32,.10)" },
  critical: { colour: "#FF5A5A", background: "rgba(255,90,90,.12)" },
};

const dismissKey = (id: string) => `loopinglive_announcement_${id}`;

export function AnnouncementBanner() {
  const [item, setItem] = useState<Announcement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/announcements", { cache: "no-store" });
        if (!response.ok || cancelled) return;

        const { announcement } = (await response.json()) as {
          announcement: Announcement | null;
        };
        if (!announcement) return;

        // Critical announcements ignore any prior dismissal.
        if (announcement.type !== "critical") {
          try {
            if (localStorage.getItem(dismissKey(announcement.id))) return;
          } catch {
            // Private mode and blocked storage both mean "not dismissed".
          }
        }

        setItem(announcement);
      } catch {
        /* a missing banner is not worth surfacing */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!item) return null;

  const tone = TONE[item.type] ?? TONE.info;
  const dismissable = item.type !== "critical";

  function dismiss() {
    if (!item) return;
    try {
      localStorage.setItem(dismissKey(item.id), "1");
    } catch {
      /* dismissal simply will not persist */
    }
    setItem(null);
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 px-6 py-3 lg:px-10"
      style={{ background: tone.background, borderBottom: `1px solid ${tone.colour}33` }}
    >
      {item.type === "critical" || item.type === "warning" ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: tone.colour }} />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: tone.colour }} />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium" style={{ color: tone.colour }}>
          {item.title}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#C4C4D0]">{item.body}</p>
      </div>

      {dismissable && (
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-1 text-[#6E6E80] transition-colors hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
