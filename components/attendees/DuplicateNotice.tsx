"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Loader2, Users } from "lucide-react";

type Registrant = {
  id: string;
  full_name: string;
  email: string;
  attended: boolean;
  bought: boolean;
  watch_seconds: number;
  created_at: string;
};

type Group = { key: string; copies: number; registrants: Registrant[] };

/**
 * Registrations that are the same person twice.
 *
 * Only appears when there are any — a permanent empty panel would be a
 * standing accusation about data that is fine. Shows the inflation rather
 * than the raw count, because "42 registered" being really 39 is the part
 * that changes what a host concludes.
 */
export function DuplicateNotice({ webinarId }: { webinarId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [extra, setExtra] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/duplicates`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      groups: Group[];
      extraCount: number;
    };
    setGroups(payload.groups);
    setExtra(payload.extraCount);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (groups.length === 0) return null;

  return (
    <section className="rounded-xl border border-[#F5A623]/30 bg-[#F5A623]/[0.06] px-4 py-3">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <Users className="h-4 w-4 shrink-0 text-[#F5A623]" />
        <span className="flex-1 text-[12.5px] text-[#C4C4D0]">
          <strong className="font-medium text-white">
            {groups.length} {groups.length === 1 ? "person" : "people"} registered
            more than once
          </strong>{" "}
          — your registration count is {extra} higher than the number of people.
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#6E6E80] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-[#F5A623]/20 pt-3">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#6E6E80]">
                {group.key}
              </p>
              <ul className="mt-1 space-y-1">
                {group.registrants.map((person) => (
                  <li key={person.id} className="text-[12.5px]">
                    <Link
                      href={`/admin/webinar/${webinarId}/attendees/${person.id}`}
                      className="text-[#C4C4D0] hover:text-white"
                    >
                      {person.full_name}{" "}
                      <span className="text-[#6E6E80]">{person.email}</span>
                    </Link>
                    <span className="ml-2 text-[11px] text-[#6E6E80]">
                      {person.bought
                        ? "bought"
                        : person.attended
                          ? `watched ${Math.round(person.watch_seconds / 60)}m`
                          : "did not attend"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="text-[11.5px] leading-relaxed text-[#6E6E80]">
            These are not merged automatically — merging means choosing which
            watch history and which purchase survives, and that is not a
            decision to make on your behalf. New registrations are matched from
            now on, so this list will not grow.
          </p>
        </div>
      )}
    </section>
  );
}

type Mismatch = {
  registrant_id: string;
  full_name: string;
  email: string;
  attended: boolean;
  join_events: number;
  problem: string;
};

/**
 * Where the attended flag and the event log disagree about the same person.
 *
 * The two are read by different parts of the product — analytics trusts the
 * log, the room and the messaging engine trust the flag — so a disagreement
 * shows up as a host whose attendance number depends on which screen they are
 * looking at. New ones cannot occur; the join transition is atomic. This is
 * for rows written before it was.
 */
export function AttendanceNotice({ webinarId }: { webinarId: string }) {
  const [mismatches, setMismatches] = useState<Mismatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [fixed, setFixed] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/reconcile`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { mismatches: Mismatch[] };
    setMismatches(payload.mismatches);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (mismatches.length === 0 && !fixed) return null;

  if (fixed) {
    return (
      <section className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/[0.06] px-4 py-3 text-[12.5px] text-[#C4C4D0]">
        {fixed}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#F5A623]/30 bg-[#F5A623]/[0.06] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-[#F5A623]" />
        <p className="flex-1 text-[12.5px] text-[#C4C4D0]">
          <strong className="font-medium text-white">
            {mismatches.length}{" "}
            {mismatches.length === 1 ? "record" : "records"} disagree with the
            event log
          </strong>{" "}
          — your attendance figure depends on which screen you are looking at.
        </p>

        <button
          onClick={async () => {
            setBusy(true);
            const response = await fetch(
              `/api/admin/webinar/${webinarId}/reconcile`,
              { method: "POST" }
            );
            const payload = (await response.json()) as {
              result?: Record<string, number>;
              error?: string;
            };
            setBusy(false);
            if (!response.ok || !payload.result) return;

            const { flagged = 0, events_written = 0, duplicates_removed = 0 } =
              payload.result;
            setFixed(
              `Reconciled — ${flagged} marked as attended, ${events_written} missing ${
                events_written === 1 ? "event" : "events"
              } written, ${duplicates_removed} duplicate ${
                duplicates_removed === 1 ? "join" : "joins"
              } removed.`
            );
            setMismatches([]);
          }}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#F5A623]/50 px-3 text-[12px] text-[#F5A623] hover:bg-[#F5A623]/10 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Reconcile
        </button>
      </div>

      <ul className="mt-2.5 space-y-0.5 border-t border-[#F5A623]/20 pt-2.5">
        {mismatches.slice(0, 8).map((row) => (
          <li key={row.registrant_id} className="text-[11.5px] text-[#6E6E80]">
            <span className="text-[#C4C4D0]">{row.full_name}</span> — {row.problem}
          </li>
        ))}
        {mismatches.length > 8 && (
          <li className="text-[11.5px] text-[#6E6E80]">
            and {mismatches.length - 8} more
          </li>
        )}
      </ul>
    </section>
  );
}
