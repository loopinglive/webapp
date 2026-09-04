"use client";

import { Loader2 } from "lucide-react";

import { useTeam } from "@/hooks/useTeam";
import { TeamBillingCard } from "@/components/teams/TeamBillingCard";

/** Fetches the team, then hands it to the card — kept separate so the page stays a server component. */
export function TeamBillingClient({ teamId }: { teamId: string }) {
  const { team, usage, loading } = useTeam(teamId);

  if (loading || !team || !usage) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return <TeamBillingCard team={team} usage={usage} />;
}
