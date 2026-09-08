"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { PluginSandbox } from "@/components/plugins/PluginSandbox";
import { useToast } from "@/components/ui/ToastProvider";
import type { PluginManifest } from "@/lib/plugins/manifest";

const EXAMPLE_MANIFEST = JSON.stringify(
  {
    name: "Confetti Celebration",
    slug: "confetti-celebration",
    version: "1.0.0",
    description: "Fires a confetti animation when the offer button is clicked.",
    category: "engagement",
    permissions: ["webinar:events:read", "ui:overlay:show"],
    hooks: [{ event: "offer.clicked", handler: "onOfferClicked" }],
    settings_schema: {
      duration: { type: "number", label: "Duration (seconds)", default: 3 },
    },
  },
  null,
  2
);

type MyPlugin = { id: string; name: string; slug: string; version: string; is_approved: boolean; is_active: boolean };

export function DeveloperPortal() {
  const toast = useToast();
  const [myPlugins, setMyPlugins] = useState<MyPlugin[] | null>(null);
  const [manifestText, setManifestText] = useState(EXAMPLE_MANIFEST);
  const [bundleUrl, setBundleUrl] = useState("");
  const [pricingType, setPricingType] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<{ bundleUrl: string; manifest: PluginManifest } | null>(null);

  const loadMine = useCallback(async () => {
    const response = await fetch("/api/plugins/develop/submit", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { plugins: MyPlugin[] };
      setMyPlugins(payload.plugins);
    } else {
      setMyPlugins([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadMine(), 0);
    return () => clearTimeout(timer);
  }, [loadMine]);

  async function submit() {
    setError(null);

    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      setError("That manifest is not valid JSON.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/plugins/develop/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manifest, bundleUrl, pricingType, price }),
    });
    const payload = (await response.json()) as { error?: string };
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not submit that plugin.");
      return;
    }
    toast.success("Submitted for review — up to 5 business days.");
    await loadMine();
  }

  async function openSandbox(pluginId: string) {
    const response = await fetch(`/api/plugins/develop/sandbox?pluginId=${pluginId}`);
    if (!response.ok) {
      toast.error("Could not load that plugin for testing.");
      return;
    }
    const payload = (await response.json()) as { bundleUrl: string; manifest: PluginManifest };
    setTesting(payload);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-ink">Submit a plugin</h2>
        <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-faint">
          Review takes up to 5 business days. Re-submitting a slug you already
          own replaces it and resets review — a changed bundle is a changed
          plugin.
        </p>

        <label className="mt-4 block">
          <span className="text-[12px] text-ink-muted">Manifest (JSON)</span>
          <textarea
            value={manifestText}
            onChange={(event) => setManifestText(event.target.value)}
            rows={12}
            spellCheck={false}
            className="mt-1.5 w-full resize-none rounded-lg border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[12px] text-ink-muted">Bundle URL (https://)</span>
          <input
            value={bundleUrl}
            onChange={(event) => setBundleUrl(event.target.value)}
            placeholder="https://your-cdn.com/plugin/index.html"
            className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-void px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>

        <div className="mt-3 flex gap-3">
          <label className="flex items-center gap-2 text-[12.5px] text-ink-muted">
            <input
              type="radio"
              checked={pricingType === "free"}
              onChange={() => setPricingType("free")}
              className="accent-accent"
            />
            Free
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-ink-muted">
            <input
              type="radio"
              checked={pricingType === "paid"}
              onChange={() => setPricingType("paid")}
              className="accent-accent"
            />
            Paid
          </label>
          {pricingType === "paid" && (
            <input
              type="number"
              min={0}
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
              placeholder="Price (USD)"
              className="h-9 w-32 rounded-lg border border-hairline bg-void px-3 text-[12.5px] text-ink"
            />
          )}
        </div>

        {error && <p className="mt-3 text-[12.5px] text-[#FF6B6B]">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting || !bundleUrl}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Submit for review
        </button>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold text-ink">Your plugins</h2>
        {!myPlugins ? (
          <Loader2 className="mt-3 h-4 w-4 animate-spin text-ink-faint" />
        ) : myPlugins.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-faint">Nothing submitted yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myPlugins.map((plugin) => (
              <li
                key={plugin.id}
                className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-[13.5px] font-medium text-ink">
                    {plugin.name} <span className="text-ink-faint">v{plugin.version}</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-faint">
                    {plugin.is_approved ? "Approved" : "Pending review"}
                  </p>
                </div>
                <button
                  onClick={() => openSandbox(plugin.id)}
                  className="inline-flex h-8 items-center rounded-lg border border-hairline px-3 text-[12px] text-ink-muted hover:text-ink"
                >
                  Test in sandbox
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {testing && (
        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <h2 className="text-[15px] font-semibold text-ink">Sandbox</h2>
          <div className="mt-4">
            <PluginSandbox bundleUrl={testing.bundleUrl} manifest={testing.manifest} />
          </div>
        </section>
      )}
    </div>
  );
}
