"use client";

import { useState } from "react";
import { Copy, Loader2, Network, Plug, Trash2 } from "lucide-react";

import { useFederation, type Partnership } from "@/hooks/useFederation";

const TYPES = [
  { value: "cross_promotion", label: "Cross-promotion", hint: "Promote each other's webinars." },
  { value: "audience_share", label: "Audience share", hint: "Exchange hashed audiences, with consent." },
  { value: "full", label: "Full partnership", hint: "Promotion, audience and shared analytics." },
] as const;

/**
 * Federation links this instance to another one running the same protocol.
 * Two keys are involved and they are not interchangeable: the one issued here
 * is what the partner calls us with, and the one they issue is what we call
 * them with. The UI keeps that distinction visible because getting it
 * backwards is the obvious way to waste an afternoon.
 */
export function FederationManager() {
  const { partnerships, configured, loading, create, savePartnerKey, verify, remove } = useFederation();

  const [url, setUrl] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("cross_promotion");
  const [creating, setCreating] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setCreating(true);
    setError(null);
    const result = await create({ partnerPlatformUrl: url.trim(), partnershipType: type });
    setCreating(false);
    if (!result.ok) {
      setError(result.error ?? "Could not create that partnership.");
      return;
    }
    setIssuedKey(result.issuedKey ?? null);
    setUrl("");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent-soft">
          <Network className="h-4 w-4" />
        </span>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Platform federation</h1>
      </div>
      <p className="mt-2 text-[13px] text-ink-muted">
        Link up with another platform instance to cross-promote webinars, exchange hashed audiences, or share
        headline analytics.
      </p>

      {!configured && (
        <p className="mt-5 rounded-xl border border-hairline bg-surface px-4 py-3 text-[12.5px] text-ink-faint">
          Federation needs <code className="text-ink-muted">FEDERATION_SIGNING_SECRET</code> set on this deployment.
          Until it is, keys can&rsquo;t be issued or verified.
        </p>
      )}

      {issuedKey && (
        <div className="mt-5 rounded-xl border border-accent/40 bg-accent/8 p-4">
          <p className="text-[12.5px] font-medium text-ink">Give this key to your partner</p>
          <p className="mt-1 text-[11.5px] text-ink-muted">
            It&rsquo;s what they&rsquo;ll call your instance with. This is the only time it&rsquo;s shown — only a
            hash is stored here.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 text-[11.5px] text-ink">{issuedKey}</code>
            <button
              onClick={() => void navigator.clipboard?.writeText(issuedKey)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hairline text-ink-muted hover:text-ink"
              title="Copy"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <button onClick={() => setIssuedKey(null)} className="mt-2.5 text-[11.5px] text-ink-faint hover:text-ink">
            I&rsquo;ve saved it
          </button>
        </div>
      )}

      <div className="mt-6 space-y-3 rounded-xl border border-hairline bg-surface p-4">
        <label className="block">
          <span className="text-[12.5px] text-ink-muted">Partner platform URL</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://partner.example.com"
            className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>

        <div>
          <span className="text-[12.5px] text-ink-muted">Partnership type</span>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
            {TYPES.map((option) => (
              <button
                key={option.value}
                onClick={() => setType(option.value)}
                className={`rounded-lg border p-2.5 text-left transition-colors ${
                  type === option.value ? "border-accent bg-accent/10" : "border-hairline hover:border-accent/40"
                }`}
              >
                <span className="block text-[12px] font-medium text-ink">{option.label}</span>
                <span className="mt-0.5 block text-[10.5px] text-ink-faint">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>}

        <button
          onClick={() => void submit()}
          disabled={creating || !configured || !url.startsWith("http")}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[13px] font-semibold text-white hover:bg-accent-soft disabled:opacity-40"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
          Create partnership
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-[12.5px] text-ink-faint">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : partnerships.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">No partnerships yet.</p>
        ) : (
          partnerships.map((partnership) => (
            <PartnershipRow
              key={partnership.id}
              partnership={partnership}
              onSaveKey={(key) => void savePartnerKey(partnership.id, key)}
              onVerify={() => verify(partnership.id)}
              onRemove={() => void remove(partnership.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PartnershipRow({
  partnership,
  onSaveKey,
  onVerify,
  onRemove,
}: {
  partnership: Partnership;
  onSaveKey: (key: string) => void;
  onVerify: () => Promise<{ ok: boolean; message: string }>;
  onRemove: () => void;
}) {
  const [partnerKey, setPartnerKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function runVerify() {
    setVerifying(true);
    setResult(await onVerify());
    setVerifying(false);
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] text-ink">{partnership.partner_platform_url}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                partnership.status === "active" ? "bg-[#00C851]/15 text-[#00C851]" : "bg-white/8 text-ink-faint"
              }`}
            >
              {partnership.status}
            </span>
          </div>
          <p className="mt-0.5 text-[11.5px] text-ink-faint">
            {partnership.partnership_type.replace("_", " ")}
            {partnership.last_verified_at && ` · verified ${new Date(partnership.last_verified_at).toLocaleDateString()}`}
          </p>
        </div>
        <button
          onClick={onRemove}
          title="Remove"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-[#FF6B6B]/10 hover:text-[#FF6B6B]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {partnership.hasPartnerKey ? (
          <button
            onClick={() => void runVerify()}
            disabled={verifying}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline px-3 text-[12px] text-ink-muted hover:text-ink disabled:opacity-40"
          >
            {verifying && <Loader2 className="h-3 w-3 animate-spin" />}
            Test connection
          </button>
        ) : (
          <>
            <input
              value={partnerKey}
              onChange={(event) => setPartnerKey(event.target.value)}
              placeholder="Key your partner issued you (llf_…)"
              className="h-8 min-w-[240px] flex-1 rounded-lg border border-hairline bg-surface-2 px-2.5 text-[12px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
            <button
              onClick={() => {
                onSaveKey(partnerKey.trim());
                setPartnerKey("");
              }}
              disabled={!partnerKey.trim()}
              className="h-8 rounded-full bg-accent px-3.5 text-[12px] font-medium text-white disabled:opacity-40"
            >
              Save key
            </button>
          </>
        )}
      </div>

      {result && (
        <p className={`mt-2 text-[11.5px] ${result.ok ? "text-[#00C851]" : "text-[#FF6B6B]"}`}>{result.message}</p>
      )}
    </div>
  );
}
