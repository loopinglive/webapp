"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Plug, Zap } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

type Integration = {
  id: string;
  provider: string;
  status: string;
  account_name: string | null;
  settings: Record<string, string>;
  last_error: string | null;
  connected_at: string;
  last_synced_at: string | null;
};

type Provider = {
  id: string;
  name: string;
  blurb: string;
  /** What the connect form asks for. */
  fields: { key: string; label: string; placeholder: string }[];
  /** The label for the list/form picker returned after verification. */
  optionLabel?: string;
  optionKey?: string;
};

const PROVIDERS: Provider[] = [
  {
    id: "mailchimp",
    name: "Mailchimp",
    blurb: "Add registrants to an audience and tag them as they progress.",
    fields: [{ key: "apiKey", label: "API key", placeholder: "abc123…-us21" }],
    optionLabel: "Audience",
    optionKey: "listId",
  },
  {
    id: "convertkit",
    name: "ConvertKit",
    blurb: "Subscribe registrants to a form and apply tags automatically.",
    fields: [{ key: "apiKey", label: "API key", placeholder: "Your ConvertKit API key" }],
    optionLabel: "Form",
    optionKey: "formId",
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    blurb: "Sync contacts to a list with tags for every webinar event.",
    fields: [
      { key: "apiKey", label: "API token", placeholder: "Your API token" },
      {
        key: "apiUrl",
        label: "Account URL",
        placeholder: "https://youraccount.api-us1.com",
      },
    ],
    optionLabel: "List",
    optionKey: "listId",
  },
  {
    id: "gohighlevel",
    name: "GoHighLevel",
    blurb: "Create or update contacts and merge tags into your pipeline.",
    fields: [{ key: "apiKey", label: "API key", placeholder: "Your location API key" }],
  },
];

export function IntegrationsHub() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/integrations", { cache: "no-store" });
    if (response.ok) {
      const { integrations } = (await response.json()) as {
        integrations: Integration[];
      };
      setIntegrations(integrations);
    } else {
      setIntegrations([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function disconnect(provider: string) {
    const response = await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });

    if (response.ok) {
      toast.success("Disconnected.");
      await load();
    } else {
      toast.error("Could not disconnect.");
    }
  }

  if (!integrations) {
    return (
      <div className="grid gap-4 px-6 py-8 sm:grid-cols-2 lg:px-10 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
            <Skeleton className="mt-5 h-9 w-28 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const connected = new Map(integrations.map((row) => [row.provider, row]));

  return (
    <div className="space-y-6 px-6 py-8 lg:px-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const active = connected.get(provider.id);

          return (
            <div
              key={provider.id}
              className="flex flex-col rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-white">{provider.name}</h3>
                {active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00C851]/12 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#00C851]">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-[#1E1E2E] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#6E6E80]">
                    Not connected
                  </span>
                )}
              </div>

              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[#A0A0B0]">
                {provider.blurb}
              </p>

              {active?.last_error && (
                <p className="mt-3 rounded-lg bg-[#FF5A5A]/10 px-3 py-2 text-[12px] text-[#FF6B6B]">
                  Last sync failed: {active.last_error}
                </p>
              )}

              {active?.last_synced_at && (
                <p className="mt-3 text-[11.5px] text-[#6E6E80]">
                  Last synced{" "}
                  {new Date(active.last_synced_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}

              <div className="mt-5">
                {active ? (
                  <button
                    onClick={() => disconnect(provider.id)}
                    className="h-9 rounded-full border border-[#2A2A3A] px-4 text-[13px] text-[#A0A0B0] transition-colors hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => setOpen(provider.id)}
                    className="h-9 rounded-full bg-[#6C47FF] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#7C5AFF]"
                  >
                    Connect
                  </button>
                )}
              </div>

              {open === provider.id && (
                <ConnectForm
                  provider={provider}
                  onClose={() => setOpen(null)}
                  onConnected={async () => {
                    setOpen(null);
                    toast.success(`${provider.name} connected.`);
                    await load();
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Zapier is not an API connection — it is the webhook surface. */}
        <div className="flex flex-col rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#FFB020]" />
            <h3 className="text-[15px] font-semibold text-white">Zapier</h3>
          </div>
          <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[#A0A0B0]">
            Send every webinar event to Zapier — or anywhere else — with outbound
            webhooks.
          </p>
          <Link
            href="/settings/webhooks"
            className="mt-5 inline-flex h-9 w-fit items-center rounded-full border border-[#2A2A3A] px-4 text-[13px] text-white transition-colors hover:border-[#6C47FF]/50"
          >
            Manage webhooks
          </Link>
        </div>
      </div>

      {integrations.length === 0 && (
        <EmptyState
          icon="🔌"
          title="Nothing connected yet"
          description="Connect your favourite tools and every registrant, attendee and buyer flows into them automatically."
        />
      )}
    </div>
  );
}

function ConnectForm({
  provider,
  onClose,
  onConnected,
}: {
  provider: Provider;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<{ id: string; name: string }[] | null>(null);
  const [chosen, setChosen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = values.apiKey ?? "";

  async function submit(withOption?: string) {
    setBusy(true);
    setError(null);

    const settings: Record<string, string> = {};
    for (const field of provider.fields) {
      if (field.key !== "apiKey") settings[field.key] = values[field.key] ?? "";
    }
    if (provider.optionKey && withOption) settings[provider.optionKey] = withOption;

    const response = await fetch("/api/integrations/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: provider.id, apiKey, settings }),
    });

    const payload = (await response.json()) as {
      error?: string;
      options?: { id: string; name: string }[];
    };
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not connect.");
      return;
    }

    // Two-step where the provider has lists: verify the key, then let the host
    // choose where contacts land before calling it connected.
    if (provider.optionKey && payload.options?.length && !withOption) {
      setOptions(payload.options);
      return;
    }

    onConnected();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-[#1E1E2E] pt-4">
      {!options ? (
        <>
          {provider.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="text-[12px] text-[#A0A0B0]">{field.label}</span>
              <input
                value={values[field.key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value }))
                }
                placeholder={field.placeholder}
                className="mt-1.5 h-9 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
              />
            </label>
          ))}
        </>
      ) : (
        <label className="block">
          <span className="flex items-center gap-1.5 text-[12px] text-[#A0A0B0]">
            {provider.optionLabel}
            <HelpTooltip content="New registrants are added here, and tagged as they attend, watch and buy." />
          </span>
          <select
            value={chosen}
            onChange={(event) => setChosen(event.target.value)}
            className="mt-1.5 h-9 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[13px] text-white focus:outline-none"
          >
            <option value="">Choose…</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-[12px] text-[#FF6B6B]">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={() => submit(options ? chosen : undefined)}
          disabled={busy || !apiKey || (Boolean(options) && !chosen)}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[13px] font-medium text-white hover:bg-[#7C5AFF] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
          {options ? "Finish" : "Verify key"}
        </button>
        <button
          onClick={onClose}
          className="h-9 px-2 text-[13px] text-[#6E6E80] hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
