"use client";

import { teamRoleCan, type TeamCapability, type TeamRole } from "@/lib/teams/roles";

/**
 * Whether the given role can do something, for deciding what to render.
 *
 * The server re-checks every one of these on the actual route — this is only
 * for hiding a control that would just be refused, never the real gate.
 */
export function useTeamPermissions(role: TeamRole | null) {
  return {
    role,
    can: (capability: TeamCapability) => teamRoleCan(role, capability),
  };
}
