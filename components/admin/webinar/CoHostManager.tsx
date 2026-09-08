"use client";

import { useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";

import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { useCoHosting, type CoHostPermissions } from "@/hooks/useCoHosting";

const PERMISSION_LABELS: { key: keyof CoHostPermissions; label: string; hint: string }[] = [
  { key: "chat", label: "Live chat", hint: "Post as a host" },
  { key: "moderate", label: "Moderate", hint: "Delete messages, handle raised hands" },
  { key: "offers", label: "Offer control", hint: "Reveal or hide the offer" },
  { key: "analytics", label: "Analytics", hint: "See attendees and numbers" },
];

export function CoHostManager({ webinarId }: { webinarId: string }) {
  const { coHosts, loading, invite, revoke } = useCoHosting(webinarId);
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<CoHostPermissions>({
    chat: true,
    moderate: true,
    offers: false,
    analytics: false,
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    const result = await invite(email.trim(), permissions);
    setSending(false);
    if (!result.ok) {
      setError(result.error ?? "Could not send that invitation.");
      return;
    }
    setEmail("");
  }

  return (
    <>
      <SectionHeader
        title="Co-hosts"
        description="Invite someone to help run this webinar's sessions. They get exactly the permissions you tick — never the webinar's settings."
      />

      <div className="max-w-2xl space-y-6 px-6 py-8 lg:px-8">
        <div className="space-y-4 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4">
          <Field label="Email address">
            <TextInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@example.com"
            />
          </Field>

          <div>
            <span className="text-[12px] font-medium text-[#A0A0B0]">Permissions</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PERMISSION_LABELS.map((permission) => (
                <label
                  key={permission.key}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#1E1E2E] px-3 py-2.5 hover:border-[#2A2A3A]"
                >
                  <input
                    type="checkbox"
                    checked={permissions[permission.key]}
                    onChange={(event) =>
                      setPermissions((current) => ({ ...current, [permission.key]: event.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#6C47FF]"
                  />
                  <span>
                    <span className="block text-[12.5px] text-white">{permission.label}</span>
                    <span className="mt-0.5 block text-[11px] text-[#6E6E80]">{permission.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}

          <AdminButton onClick={() => void send()} disabled={sending || !email.includes("@")}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Send invitation
          </AdminButton>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[12.5px] text-[#A0A0B0]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : coHosts.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-[#6E6E80]">No co-hosts yet.</p>
        ) : (
          <div className="space-y-2">
            {coHosts.map((coHost) => {
              const granted = PERMISSION_LABELS.filter((permission) => coHost.permissions?.[permission.key]).map(
                (permission) => permission.label
              );
              return (
                <div
                  key={coHost.id}
                  className="flex items-center justify-between rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] text-white">{coHost.co_host_email}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          coHost.status === "accepted" ? "bg-[#00C851]/15 text-[#00C851]" : "bg-[#3A3A4A] text-[#A0A0B0]"
                        }`}
                      >
                        {coHost.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[#6E6E80]">
                      {granted.length > 0 ? granted.join(" · ") : "No permissions"}
                    </p>
                  </div>
                  <button
                    onClick={() => void revoke(coHost.id)}
                    title="Revoke access"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#A0A0B0] hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
