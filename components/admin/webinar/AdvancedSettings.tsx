"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Field, TextInput } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";

type Settings = {
  on_demand_enabled: boolean;
  on_demand_expires_hours: number;
  on_demand_allow_seek: boolean;
  certificate_enabled: boolean;
  certificate_min_watch_percentage: number;
  exit_survey_enabled: boolean;
  private_messaging_enabled: boolean;
  raise_hand_enabled: boolean;
  primary_language: string;
  supported_languages: string[];
};

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
    <label className="flex items-center justify-between rounded-lg border border-surface-3 bg-surface-2 px-4 py-3.5">
      <div>
        <p className="text-[13px] font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-9 shrink-0 accent-accent"
      />
    </label>
  );
}

export function AdvancedSettings({ webinarId }: { webinarId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [celeBioConnected, setCeleBioConnected] = useState(false);
  const [celeBioSynced, setCeleBioSynced] = useState(false);
  const [celeBioBusy, setCeleBioBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/phase11-settings`, { cache: "no-store" });
      const payload = await response.json();
      setSettings(payload.webinar);
    })();

    (async () => {
      const [connRes, syncRes] = await Promise.all([
        fetch("/api/cele-bio/connection", { cache: "no-store" }),
        fetch("/api/cele-bio/sync", { cache: "no-store" }),
      ]);
      if (connRes.ok) setCeleBioConnected(Boolean((await connRes.json()).connection));
      if (syncRes.ok) {
        const payload = await syncRes.json();
        setCeleBioSynced(
          Array.isArray(payload.synced) && payload.synced.some((s: { webinar_id: string }) => s.webinar_id === webinarId)
        );
      }
    })();
  }, [webinarId]);

  async function toggleCeleBioSync() {
    setCeleBioBusy(true);
    if (celeBioSynced) {
      await fetch(`/api/cele-bio/sync?webinarId=${webinarId}`, { method: "DELETE" });
    } else {
      await fetch("/api/cele-bio/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webinarId }),
      });
    }
    setCeleBioSynced((v) => !v);
    setCeleBioBusy(false);
  }

  async function patch(update: Partial<Settings>) {
    setSettings((prev) => (prev ? { ...prev, ...update } : prev));
    setSaving(true);
    await fetch(`/api/admin/webinar/${webinarId}/phase11-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    setSaving(false);
  }

  if (!settings) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        title="Advanced"
        description="On-demand replays, certificates, exit surveys, and messaging — all optional, all off by default."
        action={saving ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : undefined}
      />

      <div className="max-w-3xl space-y-8 px-6 py-8 lg:px-8">
        <section className="space-y-3">
          <h2 className="text-[13.5px] font-semibold text-ink">On-demand mode</h2>
          <Toggle
            label="Allow replay after the live session"
            hint="Attendees get a private link to watch whenever they like."
            checked={settings.on_demand_enabled}
            onChange={(value) => patch({ on_demand_enabled: value })}
          />
          {settings.on_demand_enabled && (
            <div className="grid grid-cols-2 gap-3 pl-1">
              <Field label="Link expires after (hours)" hint="0 = never">
                <TextInput
                  type="number"
                  min={0}
                  value={settings.on_demand_expires_hours}
                  onChange={(event) => patch({ on_demand_expires_hours: Number(event.target.value) || 0 })}
                />
              </Field>
              <div className="pt-6">
                <Toggle
                  label="Allow seeking forward"
                  hint="Off keeps it a true replay — no skipping ahead."
                  checked={settings.on_demand_allow_seek}
                  onChange={(value) => patch({ on_demand_allow_seek: value })}
                />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-[13.5px] font-semibold text-ink">Certificate of attendance</h2>
          <Toggle
            label="Issue a certificate on completion"
            hint="Uses your default certificate design from Settings → White label."
            checked={settings.certificate_enabled}
            onChange={(value) => patch({ certificate_enabled: value })}
          />
          {settings.certificate_enabled && (
            <Field label="Minimum watch percentage to qualify">
              <TextInput
                type="number"
                min={0}
                max={100}
                value={settings.certificate_min_watch_percentage}
                onChange={(event) =>
                  patch({ certificate_min_watch_percentage: Number(event.target.value) || 0 })
                }
              />
            </Field>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-[13.5px] font-semibold text-ink">Exit survey</h2>
          <Toggle
            label="Ask a quick question when attendees leave"
            hint="Build the questions on the Exit Survey tab."
            checked={settings.exit_survey_enabled}
            onChange={(value) => patch({ exit_survey_enabled: value })}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-[13.5px] font-semibold text-ink">Live messaging</h2>
          <Toggle
            label="Private messaging"
            hint="Attendees can message the host privately during the live session."
            checked={settings.private_messaging_enabled}
            onChange={(value) => patch({ private_messaging_enabled: value })}
          />
          <Toggle
            label="Raise hand"
            hint="Attendees can raise a hand; the host sees a queue in the live panel."
            checked={settings.raise_hand_enabled}
            onChange={(value) => patch({ raise_hand_enabled: value })}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-[13.5px] font-semibold text-ink">Language</h2>
          <Field label="Primary language" hint="Manage translations from the Translations tab">
            <TextInput
              value={settings.primary_language}
              onChange={(event) => patch({ primary_language: event.target.value })}
              placeholder="en"
              className="w-24"
            />
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13.5px] font-semibold text-ink">Cele.bio</h2>
          {celeBioConnected ? (
            <Toggle
              label="List on Cele.bio"
              hint="Shows this webinar as a product on your connected Cele.bio profile."
              checked={celeBioSynced}
              onChange={() => !celeBioBusy && toggleCeleBioSync()}
            />
          ) : (
            <p className="rounded-lg border border-surface-3 bg-surface-2 px-4 py-3.5 text-[12.5px] text-ink-muted">
              Connect Cele.bio from{" "}
              <Link href="/settings/cele-bio" className="text-accent hover:text-accent-soft">
                Settings → Cele.bio
              </Link>{" "}
              to list this webinar there.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
