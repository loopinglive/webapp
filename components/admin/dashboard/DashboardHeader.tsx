import Link from "next/link";
import { BarChart3, LogOut, Mail, Plus } from "lucide-react";

import { SITE } from "@/lib/constants";

type Totals = {
  webinars: number;
  registrants: number;
  attendees: number;
  buyers: number;
};

export function DashboardHeader({
  adminEmail,
  totals,
}: {
  adminEmail: string | null;
  totals: Totals;
}) {
  return (
    <header className="border-b border-[#1E1E2E] px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#6C47FF]" />
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">
              {SITE.name}
            </h1>
            {adminEmail && (
              <p className="text-[12px] text-[#A0A0B0]">{adminEmail}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/emails"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[#2A2A3A] px-4 text-[14px] text-[#A0A0B0] transition-colors duration-200 hover:border-[#3A3A4A] hover:text-white"
          >
            <Mail className="h-4 w-4" />
            Email
          </Link>

          <Link
            href="/admin/analytics"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[#2A2A3A] px-4 text-[14px] text-[#A0A0B0] transition-colors duration-200 hover:border-[#3A3A4A] hover:text-white"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>

          <Link
            href="/admin/webinar/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#6C47FF] px-5 text-[14px] font-semibold text-white shadow-[0_12px_36px_-10px_#6C47FF] transition-all duration-200 hover:bg-[#7C5AFF] active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Create New Webinar
          </Link>

          {/* The admin panel had no way out either. */}
          <a
            href="/api/auth/signout"
            title="Sign out"
            aria-label="Sign out"
            className="grid h-11 w-11 place-items-center rounded-full border border-[#2A2A3A] text-[#A0A0B0] transition-colors duration-200 hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#1E1E2E] bg-[#1E1E2E] lg:grid-cols-4">
        <Stat label="Webinars" value={totals.webinars} />
        <Stat label="Registrants" value={totals.registrants} />
        <Stat label="Attendees" value={totals.attendees} />
        <Stat label="Buyers" value={totals.buyers} tone="#00C851" />
      </dl>
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="bg-[#12121A] px-5 py-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
        {label}
      </dt>
      <dd
        className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-white"
        style={tone ? { color: tone } : undefined}
      >
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
