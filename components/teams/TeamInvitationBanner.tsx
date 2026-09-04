"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { TEAM_ROLE_LABELS, type TeamRole } from "@/lib/teams/roles";

/**
 * What a token-carrying link resolves to and lets someone do about it.
 *
 * Reads the token from the URL rather than taking it as a prop, so the page
 * that renders this can stay a plain server component and this is the only
 * part that needs to be a client — matching how the rest of this dashboard
 * splits server/client at the page boundary.
 */
export function TeamInvitationBanner({ token }: { token: string }) {
  const toast = useToast();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; team: { name: string } | null; role: TeamRole; email: string }
    | { status: "accepting" }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/teams/accept-invite?token=${token}`, { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (payload: {
          error?: string;
          team?: { name: string } | null;
          role?: TeamRole;
          invitedEmail?: string;
        }) => {
          if (cancelled) return;
          if (payload.error || !payload.role) {
            setState({ status: "error", message: payload.error ?? "Invalid invitation." });
            return;
          }
          setState({
            status: "ready",
            team: payload.team ?? null,
            role: payload.role,
            email: payload.invitedEmail ?? "",
          });
        }
      )
      .catch(() => {
        if (!cancelled) setState({ status: "error", message: "Could not reach the server." });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function accept() {
    setState((current) => (current.status === "ready" ? { status: "accepting" } : current));
    const response = await fetch("/api/teams/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = (await response.json()) as { error?: string; teamId?: string };

    if (!response.ok) {
      toast.error(payload.error ?? "Could not accept the invitation.");
      setState({ status: "error", message: payload.error ?? "Could not accept." });
      return;
    }

    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/team");
  }

  if (state.status === "loading") {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-[15px] text-[#FF5A5A]">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-[20px] font-semibold text-white">
        Join {state.status === "ready" ? state.team?.name ?? "this team" : "…"}
      </h1>
      {state.status === "ready" && (
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#A0A0B0]">
          You have been invited as {TEAM_ROLE_LABELS[state.role]}. This must be
          accepted while signed in as {state.email}.
        </p>
      )}
      <button
        onClick={() => void accept()}
        disabled={state.status === "accepting"}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#6C47FF] px-5 text-[14px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-60"
      >
        {state.status === "accepting" && <Loader2 className="h-4 w-4 animate-spin" />}
        Accept invitation
      </button>
    </div>
  );
}
