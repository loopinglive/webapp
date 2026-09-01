"use client";

import { useIsHydrated } from "@/hooks/useIsHydrated";

// Rule 8: every time an attendee sees is in their own timezone. Formatted only
// once hydrated so the server's locale never leaks into the markup.
export function LocalTime({
  iso,
  className,
  fallback = "—",
}: {
  iso: string | null;
  className?: string;
  fallback?: string;
}) {
  const hydrated = useIsHydrated();

  const label =
    hydrated && iso
      ? new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(new Date(iso))
      : fallback;

  return <span className={className}>{label}</span>;
}
