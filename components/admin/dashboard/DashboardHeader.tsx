import Link from "next/link";
import { BarChart3, LogOut, Mail, Plus } from "lucide-react";

import { LogoMark } from "@/components/brand/Logo";
import { SITE } from "@/lib/constants";

type Totals = {
  webinars: number;
  registrants: number;
  attendees: number;
  buyers: number;
};

/**
 * Shared by the platform operator and by every customer running their own
 * webinars, so it has to know which it is showing.
 *
 * The email gallery and platform analytics behind these two links are
 * operator-only — their pages check the operator identity server-side and
 * always did — but the links were rendered for everyone. A customer saw
 * "Email" and "Analytics" in their own dashboard and, on clicking, got
 * bounced to a login page while already signed in. Nothing leaked, but
 * offering someone a door into your internals and then slamming it is its
 * own kind of broken.
 */
export function DashboardHeader({
  adminEmail,
  totals,
  isPlatformAdmin = false,
}: {
  adminEmail: string | null;
  totals: Totals;
  isPlatformAdmin?: boolean;
}) {
  return (
    <header className="border-b border-hairline px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LogoMark size={32} title={SITE.name} />
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
              {SITE.name}
            </h1>
            {adminEmail && (
              <p className="text-[12px] text-ink-muted">{adminEmail}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPlatformAdmin && (
            <>
              <Link
                href="/admin/emails"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-surface-3 px-4 text-[14px] text-ink-muted transition-colors duration-200 hover:border-surface-3 hover:text-ink"
              >
                <Mail className="h-4 w-4" />
                Email
              </Link>

              <Link
                href="/admin/analytics"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-surface-3 px-4 text-[14px] text-ink-muted transition-colors duration-200 hover:border-surface-3 hover:text-ink"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
            </>
          )}

          <Link
            href="/admin/webinar/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[14px] font-semibold text-white shadow-[0_12px_36px_-10px_#6C47FF] transition-all duration-200 hover:bg-accent-soft active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Create New Webinar
          </Link>

          {/* The admin panel had no way out either. */}
          <a
            href="/api/auth/signout"
            title="Sign out"
            aria-label="Sign out"
            className="grid h-11 w-11 place-items-center rounded-full border border-surface-3 text-ink-muted transition-colors duration-200 hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline lg:grid-cols-4">
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
    <div className="bg-surface px-5 py-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd
        className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-ink"
        style={tone ? { color: tone } : undefined}
      >
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
