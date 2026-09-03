"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Users } from "lucide-react";

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
