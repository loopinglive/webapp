"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, Plus, Trash2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

type Entry = { id: string; cidr: string; label: string; created_at: string };

/**
 * Restricting the console to known addresses.
 *
 * Off by default and stays off until there is at least one entry that covers
 * whoever is turning it on — the server refuses to enable it otherwise. On by
 * default would be how an owner locks themselves out from a coffee shop with
 * no way back except a database console.
 */
export function IpAllowlistPanel() {
  const toast = useToast();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [yourIp, setYourIp] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [cidr, setCidr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/superadmin/ip-allowlist", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      entries: Entry[];
      enabled: boolean;
      yourIp: string;
    };
    setEntries(payload.entries);
    setEnabled(payload.enabled);
    setYourIp(payload.yourIp);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const add = useCallback(
    async (cidrValue: string, labelValue: string) => {
      if (!cidrValue.trim() || !labelValue.trim()) return;
      setBusy(true);
      const response = await fetch("/api/superadmin/ip-allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidr: cidrValue.trim(), label: labelValue.trim() }),
      });
      const payload = (await response.json()) as { error?: string };
      setBusy(false);

      if (!response.ok) {
        toast.error(payload.error ?? "Could not add that.");
        return;
      }
      setCidr("");
      setLabel("");
      await load();
    },
    [load, toast]
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      await fetch(`/api/superadmin/ip-allowlist?id=${id}`, { method: "DELETE" });
      setBusy(false);
      await load();
    },
    [load]
  );

  const toggle = useCallback(
    async (next: boolean) => {
      setBusy(true);
      const response = await fetch("/api/superadmin/ip-allowlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const payload = (await response.json()) as { error?: string };
      setBusy(false);

      if (!response.ok) {
        toast.error(payload.error ?? "Could not change that.");
        return;
      }
      toast.success(next ? "Allowlist is on." : "Allowlist is off.");
      await load();
    },
    [load, toast]
  );

  if (!entries) return null;

  const yourIpCovered = entries.length === 0 || !enabled;

  return (
    <section className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <Lock
              className={`h-4 w-4 ${enabled ? "text-[#22C55E]" : "text-[#6E6E80]"}`}
            />
            Console IP allowlist
          </h2>
          <p className="mt-1 max-w-[60ch] text-[11.5px] leading-relaxed text-[#6E6E80]">
            Restricts /superadmin to the addresses below. Only the console — a
            customer-facing outage from a misconfigured list would be a much
            worse failure than an admin screen being briefly unreachable.
          </p>
        </div>

        <button
          onClick={() => void toggle(!enabled)}
          disabled={busy}
          className={`h-9 shrink-0 rounded-lg px-3.5 text-[12.5px] font-medium disabled:opacity-60 ${
            enabled
              ? "border border-[#1E1E2E] text-[#A0A0B0] hover:text-white"
              : "bg-[#6C47FF] text-white hover:bg-[#5B39E0]"
          }`}
        >
          {enabled ? "Turn off" : "Turn on"}
        </button>
      </div>

      {yourIp && (
        <p className="mt-3 text-[11.5px] text-[#6E6E80]">
          Your current address is{" "}
          <code className="text-[#00D4FF]">{yourIp}</code>.{" "}
          {!yourIpCovered && (
            <span className="text-[#F5A623]">
              Add it before turning this on, or you will lock yourself out.
            </span>
          )}
        </p>
      )}

      <ul className="mt-3 space-y-1.5">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-[#0D0D15] px-3 py-2"
          >
            <span className="min-w-0 text-[12.5px]">
              <code className="text-white">{entry.cidr}</code>
              <span className="ml-2 text-[#6E6E80]">{entry.label}</span>
            </span>
            <button
              onClick={() => void remove(entry.id)}
              disabled={busy}
              aria-label={`Remove ${entry.label}`}
              className="shrink-0 rounded p-1 text-[#6E6E80] hover:text-[#FF5A5A] disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="rounded-lg border border-dashed border-[#2A2A3A] px-3 py-3 text-center text-[11.5px] text-[#6E6E80]">
            Nothing added yet. An empty list allows everyone, even with the
            toggle on.
          </li>
        )}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={cidr}
          onChange={(event) => setCidr(event.target.value)}
          placeholder="203.0.113.0/24 or a single address"
          className="h-8 min-w-0 flex-1 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
        />
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Office, VPN…"
          className="h-8 w-32 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
        />
        <button
          onClick={() => void add(cidr, label)}
          disabled={busy || !cidr.trim() || !label.trim()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1E1E2E] px-3 text-[12px] text-white hover:bg-[#2A2A3A] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Add
        </button>
        {yourIp && (
          <button
            onClick={() => void add(yourIp, "This device")}
            disabled={busy}
            className="h-8 rounded-lg px-3 text-[12px] text-[#00D4FF] hover:underline disabled:opacity-50"
          >
            Add my address
          </button>
        )}
      </div>
    </section>
  );
}
