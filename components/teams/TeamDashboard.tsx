"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, Users } from "lucide-react";

import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/components/ui/ToastProvider";
import { TEAM_ROLE_DESCRIPTIONS } from "@/lib/teams/roles";

/**
 * No-team state: create one.
 *
 * A user with no team sees this instead of a dashboard with nothing in it. It
 * is deliberately the first thing they see rather than a settings page
 * buried somewhere — starting a team is the one action available.
 */
function CreateTeamPrompt() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    const response = await fetch("/api/teams/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const payload = (await response.json()) as { error?: string };
    setCreating(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not create the team.");
      return;
    }

    // A full reload rather than a router refresh: every layout above this
    // page reads team membership server-side, and it has to re-run.
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <Users className="mx-auto h-8 w-8 text-[#6C47FF]" />
      <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-white">
        Bring your team in
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[#A0A0B0]">
        Everyone on a team shares one subscription and can collaborate on
        webinars, with permissions that match what they should actually be
        able to touch.
      </p>

      <div className="mt-6 flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void create();
          }}
          placeholder="Your team's name"
          className="h-11 flex-1 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 text-[14px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
        />
        <button
          onClick={() => void create()}
          disabled={creating || !name.trim()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6C47FF] px-4 text-[14px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-50"
        >
          {creating && <Loader2 className="h-4 w-4 animate-spin" />}
          Create
        </button>
      </div>
    </div>
  );
}

export function TeamDashboard({ teamId }: { teamId: string | null }) {
  const { team, role, usage, loading } = useTeam(teamId);

  if (!teamId) return <CreateTeamPrompt />;

  if (loading || !team) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  const memberPct = Math.min(100, Math.round((usage!.members / team.max_members) * 100));
  const webinarPct =
    team.max_webinars > 0
      ? Math.min(100, Math.round((usage!.webinars / team.max_webinars) * 100))
      : 0;

  return (
    <div className="space-y-6 px-6 py-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
            {team.name}
          </h1>
          {role && (
            <p className="mt-0.5 text-[12.5px] text-[#6E6E80]">
              You are the {role}. {TEAM_ROLE_DESCRIPTIONS[role]}
            </p>
          )}
        </div>
        <Link
          href="/team/members"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#1E1E2E] px-3.5 text-[13px] text-[#A0A0B0] hover:text-white"
        >
          <Users className="h-3.5 w-3.5" />
          Manage members
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#6E6E80]">
            Members
          </p>
          <p className="mt-1.5 text-[24px] font-semibold text-white">
            {usage!.members}
            <span className="text-[14px] font-normal text-[#6E6E80]">
              {" "}
              / {team.max_members}
            </span>
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#1E1E2E]">
            <div
              className="h-full rounded-full bg-[#6C47FF] transition-[width]"
              style={{ width: `${memberPct}%` }}
            />
          </div>
          {memberPct >= 80 && (
            <p className="mt-2 text-[11.5px] text-[#F5A623]">
              Close to your member limit.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#6E6E80]">
            Webinars
          </p>
          <p className="mt-1.5 text-[24px] font-semibold text-white">
            {usage!.webinars}
            <span className="text-[14px] font-normal text-[#6E6E80]">
              {" "}
              / {team.max_webinars || "∞"}
            </span>
          </p>
          {team.max_webinars > 0 && (
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#1E1E2E]">
              <div
                className="h-full rounded-full bg-[#00D4FF] transition-[width]"
                style={{ width: `${webinarPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#6C47FF]/25 bg-[#6C47FF]/[0.06] p-5">
        <p className="flex items-center gap-2 text-[13px] font-medium text-white">
          <Sparkles className="h-4 w-4 text-[#6C47FF]" />
          Webinars this team runs are shared
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#A0A0B0]">
          Owners and admins see every webinar any teammate creates. Editors
          only see their own — teammates cannot see what someone else on the
          team is running unless they are given a broader role.
        </p>
      </div>
    </div>
  );
}
