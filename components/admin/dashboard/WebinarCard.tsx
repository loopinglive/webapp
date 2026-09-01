"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, Copy, Radio, Settings2, Users } from "lucide-react";

import { WebinarStatusBadge } from "@/components/admin/webinar/WebinarStatusBadge";
import { LocalTime } from "@/components/webinar/LocalTime";
import { cn } from "@/lib/utils";
import type { WebinarSummary } from "@/types";

export function WebinarCard({ webinar }: { webinar: WebinarSummary }) {
  const router = useRouter();
  const [cloning, setCloning] = useState(false);

  const conversion =
    webinar.registrants > 0
      ? Math.round((webinar.attendees / webinar.registrants) * 100)
      : 0;

  async function clone() {
    setCloning(true);
    const response = await fetch(
      `/api/admin/webinar/${webinar.id}/clone`,
      { method: "POST" }
    );
    setCloning(false);
    if (!response.ok) return;
    const { webinarId } = (await response.json()) as { webinarId: string };
    router.push(`/admin/webinar/${webinarId}`);
  }

  return (
    <article className="group overflow-hidden rounded-xl border border-[#1E1E2E] bg-[#12121A] transition-colors duration-300 hover:border-[#6C47FF]/40">
      <Link href={`/admin/webinar/${webinar.id}`} className="block">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[#6C47FF]/25 via-[#12121A] to-[#00D4FF]/12">
          {webinar.thumbnail_url && (
            // Host-uploaded thumbnails live at arbitrary storage paths.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={webinar.thumbnail_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}
          <div className="absolute left-3 top-3">
            <WebinarStatusBadge status={webinar.status} />
          </div>
        </div>

        <div className="p-4">
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">
            {webinar.title}
          </h3>

          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#A0A0B0]">
            <CalendarClock className="h-3 w-3 shrink-0" />
            {webinar.nextSessionAt ? (
              <LocalTime iso={webinar.nextSessionAt} fallback="Scheduled" />
            ) : (
              "No sessions scheduled"
            )}
          </p>

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[#1E1E2E] pt-3.5">
            <Stat label="Registered" value={webinar.registrants} />
            <Stat label="Attended" value={webinar.attendees} />
            <Stat label="Show rate" value={`${conversion}%`} />
          </dl>
        </div>
      </Link>

      <div className="flex items-center gap-1 border-t border-[#1E1E2E] p-2">
        <Action href={`/admin/webinar/${webinar.id}`} icon={Settings2}>
          Edit
        </Action>
        <Action href={`/admin/webinar/${webinar.id}/schedule`} icon={Radio}>
          Sessions
        </Action>
        <button
          onClick={clone}
          disabled={cloning}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px]",
            "text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white",
            "disabled:opacity-50"
          )}
        >
          <Copy className="h-3.5 w-3.5" />
          {cloning ? "Cloning…" : "Clone"}
        </button>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]/70">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-1 text-[15px] font-semibold tabular-nums text-white">
        {typeof value === "number" && <Users className="h-3 w-3 text-[#6C47FF]" />}
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

function Action({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}
