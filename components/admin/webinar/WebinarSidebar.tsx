"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Check,
  Loader2,
  MessageSquare,
  Settings2,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";

import { REQUIRED_STEPS } from "@/lib/setup-steps";
import { cn } from "@/lib/utils";
import type { SetupChecklist } from "@/types";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  key?: keyof SetupChecklist;
};

export function WebinarSidebar({
  webinarId,
  checklist,
  status,
  onPublished,
}: {
  webinarId: string;
  checklist: SetupChecklist | null;
  status: "draft" | "published";
  onPublished?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/admin/webinar/${webinarId}`;

  const items: Item[] = [
    { href: base, label: "Overview", icon: BadgeCheck },
    { href: `${base}/schedule`, label: "Schedule", icon: CalendarClock, key: "schedule" },
    { href: `${base}/personas`, label: "Fake Personas", icon: Users, key: "personas" },
    { href: `${base}/comments`, label: "Timed Comments", icon: MessageSquare, key: "comments" },
    { href: `${base}/engagement`, label: "Engagement", icon: Zap, key: "engagement" },
    { href: `${base}/offer`, label: "Offer Button", icon: Tag, key: "offer" },
    { href: `${base}/ai`, label: "AI Moderators", icon: Sparkles, key: "ai" },
    { href: `${base}/registration`, label: "Registration Page", icon: BadgeCheck },
    { href: `${base}/attendees`, label: "Attendees", icon: UserCheck },
    { href: `${base}/settings`, label: "Settings", icon: Settings2 },
  ];

  const done = checklist
    ? REQUIRED_STEPS.filter((step) => checklist[step]).length
    : 0;
  const ready = done === REQUIRED_STEPS.length;
  const published = status === "published";

  async function togglePublish() {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish: !published }),
    });

    setBusy(false);

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: string;
        missing?: string[];
      };
      setError(payload.missing?.join(", ") ?? payload.error ?? "Could not publish.");
      return;
    }

    onPublished?.();
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-dvh w-[240px] shrink-0 flex-col border-r border-[#1E1E2E] bg-[#0D0D17] px-3 py-5">
      <Link
        href="/admin/dashboard"
        className="mb-6 flex items-center gap-2 px-3 text-[12.5px] text-[#A0A0B0] transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All webinars
      </Link>

      <div className="mb-5 px-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
            Setup
          </span>
          <span className="text-[11.5px] tabular-nums text-white">
            {done}/{REQUIRED_STEPS.length}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#1A1A2A]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6C47FF] to-[#00D4FF] transition-[width] duration-500"
            style={{ width: `${(done / REQUIRED_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {items.map((item) => {
          const active =
            item.href === base
              ? pathname === base
              : pathname.startsWith(item.href);
          const complete = item.key ? checklist?.[item.key] : undefined;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2.5 text-[13px] transition-colors duration-200",
                active
                  ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                  : "border-transparent text-[#A0A0B0] hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-[#6C47FF]" : "text-[#A0A0B0]/70"
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {complete !== undefined && (
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full",
                    complete ? "bg-[#00C851]" : "bg-[#3A3A4A]"
                  )}
                >
                  {complete && <Check className="h-2.5 w-2.5 text-[#0A0A0F]" />}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-[#1E1E2E] pt-4">
        <button
          onClick={togglePublish}
          disabled={busy || (!published && !ready)}
          title={
            !published && !ready
              ? "Finish every required section first"
              : undefined
          }
          className={cn(
            "flex h-10 w-full items-center justify-center gap-2 rounded-full text-[13px] font-semibold transition-all duration-200",
            published
              ? "border border-[#2A2A3A] text-[#A0A0B0] hover:border-[#FF3B3B]/50 hover:text-[#FF3B3B]"
              : "bg-[#6C47FF] text-white shadow-[0_10px_30px_-10px_#6C47FF] hover:bg-[#7C5AFF]",
            "disabled:pointer-events-none disabled:opacity-40"
          )}
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {published ? "Unpublish" : "Publish webinar"}
        </button>

        {error && (
          <p className="mt-2 text-[11px] leading-relaxed text-[#FF3B3B]">
            Still needed: {error}
          </p>
        )}
      </div>
    </aside>
  );
}
