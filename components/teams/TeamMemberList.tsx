"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, X } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import {
  ROLES,
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  type TeamRole,
} from "@/lib/teams/roles";

type Member = {
  id: string;
  user_id: string;
  role: TeamRole;
  status: string;
  full_name: string | null;
  email: string | null;
  invited_at: string;
};

type Invitation = {
  id: string;
  invited_email: string;
  role: TeamRole;
  expires_at: string;
  created_at: string;
};

/** The assignable roles — owner is not one of them; there is exactly one. */
const ASSIGNABLE = ROLES.filter((role) => role !== "owner") as Exclude<
  TeamRole,
  "owner"
>[];

export function TeamMemberList({
  teamId,
  currentUserId,
  canManage,
}: {
  teamId: string;
  currentUserId: string;
  canManage: boolean;
}) {
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof ASSIGNABLE)[number]>("editor");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/teams/${teamId}/members`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        members: Member[];
        invitations: Invitation[];
      };
      setMembers(payload.members);
      setInvitations(payload.invitations);
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function invite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const response = await fetch(`/api/teams/${teamId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const payload = (await response.json()) as { error?: string; warning?: string };
    setInviting(false);

    if (!response.ok && response.status !== 207) {
      toast.error(payload.error ?? "Could not send the invitation.");
      return;
    }
    toast.success(payload.warning ? "Invited — but the email did not send." : "Invited.");
    setInviteEmail("");
    await load();
  }

  async function changeRole(memberId: string, role: TeamRole) {
    setBusy(memberId);
    const response = await fetch(`/api/teams/${teamId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    setBusy(null);
    if (!response.ok) {
      toast.error("Could not change that role.");
      return;
    }
    await load();
  }

  async function remove(memberId: string, label: string) {
    if (!window.confirm(`Remove ${label} from the team?`)) return;
    setBusy(memberId);
    const response = await fetch(`/api/teams/${teamId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, remove: true }),
    });
    setBusy(null);
    if (!response.ok) {
      toast.error("Could not remove them.");
      return;
    }
    toast.success("Removed.");
    await load();
  }

  if (loading) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 lg:px-10">
      {canManage && (
        <section className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <h2 className="text-[13px] font-semibold text-white">Invite someone</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              type="email"
              placeholder="teammate@example.com"
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value as (typeof ASSIGNABLE)[number])
              }
              className="h-10 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[13px] text-white focus:outline-none"
            >
              {ASSIGNABLE.map((role) => (
                <option key={role} value={role}>
                  {TEAM_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <button
              onClick={() => void invite()}
              disabled={inviting || !inviteEmail.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6C47FF] px-4 text-[13px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-50"
            >
              {inviting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Invite
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-[#6E6E80]">
            {TEAM_ROLE_DESCRIPTIONS[inviteRole]}
          </p>
        </section>
      )}

      {invitations.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
            Pending invitations
          </h2>
          <ul className="mt-2 space-y-1.5">
            {invitations.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center gap-3 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3.5 py-2.5"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#6E6E80]" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-white">
                  {invite.invited_email}
                </span>
                <span className="shrink-0 text-[11.5px] text-[#6E6E80]">
                  {TEAM_ROLE_LABELS[invite.role]} · expires{" "}
                  {new Date(invite.expires_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
          Members
        </h2>
        <ul className="mt-2 space-y-1.5">
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId;
            const isOwner = member.role === "owner";

            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-white">
                    {member.full_name || member.email || "—"}
                    {isSelf && <span className="ml-2 text-[11px] text-[#6E6E80]">(you)</span>}
                  </p>
                  <p className="text-[11.5px] text-[#6E6E80]">{member.email}</p>
                </div>

                {canManage && !isOwner && !isSelf ? (
                  <select
                    value={member.role}
                    disabled={busy === member.id}
                    onChange={(event) =>
                      void changeRole(member.id, event.target.value as TeamRole)
                    }
                    className="h-8 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2 text-[12px] text-white focus:outline-none"
                  >
                    {ASSIGNABLE.map((role) => (
                      <option key={role} value={role}>
                        {TEAM_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded-full bg-[#1E1E2E] px-2.5 py-1 text-[11px] text-[#A0A0B0]">
                    {TEAM_ROLE_LABELS[member.role]}
                  </span>
                )}

                {canManage && !isOwner && !isSelf && (
                  <button
                    onClick={() =>
                      void remove(member.id, member.full_name || member.email || "this person")
                    }
                    disabled={busy === member.id}
                    aria-label={`Remove ${member.full_name || member.email}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#6E6E80] hover:text-[#FF5A5A] disabled:opacity-50"
                  >
                    {busy === member.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
