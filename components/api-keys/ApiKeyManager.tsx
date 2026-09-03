"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, Loader2, Plus } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

const EXPIRY = [
  { id: "never", label: "Never expires" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "1y", label: "1 year" },
];

export function ApiKeyManager() {
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/keys", { cache: "no-store" });
    if (response.ok) {
      const { keys } = (await response.json()) as { keys: ApiKey[] };
      setKeys(keys);
    } else {
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function create() {
    setBusy(true);
    const response = await fetch("/api/keys/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, expiry }),
    });

    const payload = (await response.json()) as { key?: string; error?: string };
    setBusy(false);

    if (!response.ok || !payload.key) {
      toast.error(payload.error ?? "Could not create the key.");
      return;
    }

    setIssued(payload.key);
    setName("");
    setCreating(false);
    await load();
  }

  async function revoke(id: string) {
    await fetch("/api/keys/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("Key revoked. It stops working immediately.");
    await load();
  }

  return (
    <div className="space-y-6 px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[62ch] text-[13.5px] leading-relaxed text-[#A0A0B0]">
          Use an API key to read your webinars, registrants and sessions
          programmatically. See the{" "}
          <Link href="/docs/api" className="text-[#6C47FF] hover:text-[#8A6BFF]">
            API documentation
          </Link>{" "}
          for endpoints and examples.
        </p>
        <button
          onClick={() => setCreating((value) => !value)}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[13px] font-medium text-white hover:bg-[#7C5AFF]"
        >
          <Plus className="h-3.5 w-3.5" />
          New API key
        </button>
      </div>

      {creating && (
        <div className="max-w-[520px] space-y-3.5 rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <label className="block">
            <span className="text-[12px] text-[#A0A0B0]">What is it for?</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Zapier integration"
              className="mt-1.5 h-10 w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-[#A0A0B0]">Expiry</span>
            <select
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white focus:outline-none"
            >
              {EXPIRY.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#6C47FF] px-5 text-[13px] font-semibold text-white hover:bg-[#7C5AFF] disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
            Generate key
          </button>
        </div>
      )}

      {issued && <IssuedKey value={issued} onClose={() => setIssued(null)} />}

      {!keys ? (
        <SkeletonRows rows={4} columns={5} />
      ) : keys.length === 0 ? (
        <EmptyState
          icon="🔑"
          title="No API keys yet"
          description="Create one to start using the Loopinglive API. You will see the key once, at the moment it is created."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1E1E2E]">
          <table className="w-full min-w-[720px]">
            <thead className="bg-[#12121A]">
              <tr>
                {["Name", "Key", "Created", "Last used", "Expires", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2E]">
              {keys.map((key) => (
                <tr key={key.id} className={key.is_active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 text-[13px] text-white">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[#00D4FF]">
                    {key.key_prefix}…
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#6E6E80]">
                    {new Date(key.created_at).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#6E6E80]">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })
                      : "never"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#6E6E80]">
                    {key.expires_at
                      ? new Date(key.expires_at).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })
                      : "never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {key.is_active ? (
                      <button
                        onClick={() => revoke(key.id)}
                        className="text-[12px] text-[#A0A0B0] hover:text-[#FF5A5A]"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-[12px] text-[#6E6E80]">Revoked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * The one and only time the plaintext key is visible.
 *
 * Only the hash is stored, so this cannot be shown again — the modal says so
 * plainly rather than letting someone close it and find out later.
 */
function IssuedKey({ value, onClose }: { value: string; onClose: () => void }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-[560px] rounded-2xl border border-[#1E1E2E] bg-[#0D0D15] p-6">
        <h3 className="text-[18px] font-semibold text-white">Copy your API key now</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#A0A0B0]">
          This is the only time it will be shown. We store a hash, not the key, so we
          cannot show it to you again — if you lose it, revoke it and make another.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-[#00D4FF]">
            {value}
          </code>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              toast.success("API key copied.");
            }}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#2A2A3A] px-3 text-[12.5px] text-white hover:border-[#6C47FF]/50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#00C851]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-5 h-10 w-full rounded-full bg-[#6C47FF] text-[13px] font-semibold text-white hover:bg-[#7C5AFF]"
        >
          I have saved it
        </button>
      </div>
    </div>
  );
}
