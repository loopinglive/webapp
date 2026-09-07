"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";

type Connection = {
  id: string;
  cele_bio_user_id: string;
  cele_bio_username: string;
  auto_sync_enabled: boolean;
  show_on_profile: boolean;
  use_cele_bio_payments: boolean;
  connected_at: string;
  last_synced_at: string | null;
};

type Webinar = { id: string; title: string };
type Synced = { webinar_id: string; cele_bio_product_id: string | null; synced_at: string };

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-4 py-3.5">
      <div>
        <p className="text-[13px] font-medium text-white">{label}</p>
        <p className="mt-0.5 text-[12px] text-[#A0A0B0]">{hint}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-9 shrink-0 accent-[#6C47FF]"
      />
    </label>
  );
}

export function CeleBioSettings() {
  const toast = useToast();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [synced, setSynced] = useState<Synced[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [connRes, webinarRes, syncRes] = await Promise.all([
      fetch("/api/cele-bio/connection", { cache: "no-store" }),
      fetch("/api/admin/webinars", { cache: "no-store" }),
      fetch("/api/cele-bio/sync", { cache: "no-store" }),
    ]);
    if (connRes.ok) setConnection((await connRes.json()).connection ?? null);
    if (webinarRes.ok) setWebinars((await webinarRes.json()).webinars ?? []);
    if (syncRes.ok) setSynced((await syncRes.json()).synced ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  async function connect() {
    setError(null);
    if (!username || !userId || !token) {
      setError("All three fields are required.");
      return;
    }
    setConnecting(true);
    const response = await fetch("/api/cele-bio/connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ celeBioUsername: username, celeBioUserId: userId, accessToken: token }),
    });
    setConnecting(false);
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Could not connect.");
      return;
    }
    setUsername("");
    setUserId("");
    setToken("");
    toast.success("Cele.bio connected.");
    await load();
  }

  async function disconnect() {
    await fetch("/api/cele-bio/connection", { method: "DELETE" });
    await load();
  }

  async function patch(update: Partial<Connection>) {
    setConnection((prev) => (prev ? { ...prev, ...update } : prev));
    await fetch("/api/cele-bio/connection", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autoSyncEnabled: update.auto_sync_enabled,
        showOnProfile: update.show_on_profile,
        useCeleBioPayments: update.use_cele_bio_payments,
      }),
    });
  }

  async function toggleSync(webinarId: string, isSynced: boolean) {
    if (isSynced) {
      await fetch(`/api/cele-bio/sync?webinarId=${webinarId}`, { method: "DELETE" });
    } else {
      await fetch("/api/cele-bio/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webinarId }),
      });
    }
    await load();
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="max-w-xl space-y-4 px-6 py-8 lg:px-10">
        <p className="text-[13.5px] text-[#A0A0B0]">
          Connect your Cele.bio account to list your webinars as products on your Cele.bio profile page.
        </p>
        <div className="space-y-3 rounded-xl border border-[#2A2A3A] bg-[#12121A] p-5">
          <Field label="Cele.bio username">
            <TextInput value={username} onChange={(event) => setUsername(event.target.value)} placeholder="yourname" />
          </Field>
          <Field label="Cele.bio user ID" hint="Found in your Cele.bio account settings">
            <TextInput value={userId} onChange={(event) => setUserId(event.target.value)} />
          </Field>
          <Field label="Access token" hint="From Cele.bio → Settings → API access">
            <TextInput type="password" value={token} onChange={(event) => setToken(event.target.value)} />
          </Field>
          {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}
          <AdminButton onClick={connect} disabled={connecting}>
            {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8 px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between rounded-xl border border-[#2A2A3A] bg-[#12121A] p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#00D4FF]" />
          <div>
            <p className="text-[13px] font-medium text-white">Connected as @{connection.cele_bio_username}</p>
            <p className="text-[11.5px] text-[#A0A0B0]">
              {connection.last_synced_at
                ? `Last synced ${new Date(connection.last_synced_at).toLocaleString()}`
                : "Not synced yet"}
            </p>
          </div>
        </div>
        <button onClick={disconnect} className="text-[12px] text-[#A0A0B0] hover:text-[#FF3B3B]">
          Disconnect
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-[13.5px] font-semibold text-white">Settings</h2>
        <Toggle
          label="Auto-sync new webinars"
          hint="New webinars are listed on your Cele.bio profile automatically."
          checked={connection.auto_sync_enabled}
          onChange={(value) => patch({ auto_sync_enabled: value })}
        />
        <Toggle
          label="Show on profile"
          hint="Synced webinars appear as products on your public Cele.bio page."
          checked={connection.show_on_profile}
          onChange={(value) => patch({ show_on_profile: value })}
        />
        <Toggle
          label="Accept payments via Cele.bio"
          hint="Route offer purchases through Cele.bio's checkout instead of Stripe."
          checked={connection.use_cele_bio_payments}
          onChange={(value) => patch({ use_cele_bio_payments: value })}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-[13.5px] font-semibold text-white">Webinars</h2>
        {webinars.length === 0 ? (
          <p className="text-[13px] text-[#A0A0B0]">No webinars yet.</p>
        ) : (
          <div className="space-y-2">
            {webinars.map((webinar) => {
              const isSynced = synced.some((s) => s.webinar_id === webinar.id);
              return (
                <div
                  key={webinar.id}
                  className="flex items-center justify-between rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-3"
                >
                  <p className="text-[13px] text-white">{webinar.title}</p>
                  <button
                    onClick={() => toggleSync(webinar.id, isSynced)}
                    className={
                      isSynced
                        ? "text-[11.5px] font-medium text-[#00D4FF]"
                        : "text-[11.5px] font-medium text-[#6C47FF] hover:text-[#7C5AFF]"
                    }
                  >
                    {isSynced ? "Synced ✓" : "Sync"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
