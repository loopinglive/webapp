"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Plus, Send, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { EVENT_LABELS, WEBHOOK_EVENTS } from "@/lib/webhooks/events";

type Endpoint = {
  id: string;
  url: string;
  description: string | null;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
};

type Log = {
  id: string;
  webhook_endpoint_id: string;
  event_type: string;
  status: string;
  response_status: number | null;
  attempt_count: number;
  error_message: string | null;
  created_at: string;
};

const STATUS_COLOUR: Record<string, string> = {
  delivered: "#00C851",
  pending: "#00D4FF",
  failed: "#FFB020",
  failed_permanently: "#FF5A5A",
  cancelled: "#6E6E80",
};

export function WebhookManager() {
  const toast = useToast();
  const [endpoints, setEndpoints] = useState<Endpoint[] | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/webhooks/endpoints", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { endpoints: Endpoint[]; logs: Log[] };
      setEndpoints(data.endpoints);
      setLogs(data.logs);
    } else {
      setEndpoints([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function create() {
    setBusy(true);
    setError(null);

    const response = await fetch("/api/webhooks/endpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events, description: description || undefined }),
    });

    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not save that endpoint.");
      return;
    }

    setUrl("");
    setDescription("");
    setEvents([]);
    setCreating(false);
    toast.success("Endpoint added.");
    await load();
  }

  async function remove(id: string) {
    await fetch("/api/webhooks/endpoints", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("Endpoint removed.");
    await load();
  }

  async function test(id: string) {
    setTesting(id);
    const response = await fetch("/api/webhooks/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = (await response.json()) as {
      result?: { status: string; response_status: number | null; error_message: string | null };
    };
    setTesting(null);

    if (payload.result?.status === "delivered") {
      toast.success(`Delivered — the endpoint returned ${payload.result.response_status}.`);
    } else {
      toast.error(
        payload.result?.error_message ?? "The endpoint did not accept the request."
      );
    }
    await load();
  }

  return (
    <div className="space-y-8 px-6 py-8 lg:px-10">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Endpoints</h2>
            <p className="mt-0.5 text-[12.5px] text-[#6E6E80]">
              Every event is sent as a signed POST. Point one at Zapier, or at your own
              server.
            </p>
          </div>
          <button
            onClick={() => setCreating((value) => !value)}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[13px] font-medium text-white hover:bg-[#7C5AFF]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add endpoint
          </button>
        </div>

        {creating && (
          <div className="mt-4 max-w-[640px] space-y-3.5 rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
            <label className="block">
              <span className="text-[12px] text-[#A0A0B0]">Endpoint URL</span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/…"
                className="mt-1.5 h-10 w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-[12px] text-[#A0A0B0]">Label (optional)</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Zapier — add to CRM"
                className="mt-1.5 h-10 w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
              />
            </label>

            <div>
              <p className="mb-2 text-[12px] text-[#A0A0B0]">
                Events — leave all unticked to receive everything
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-[#A0A0B0] hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={events.includes(event)}
                      onChange={(e) =>
                        setEvents((current) =>
                          e.target.checked
                            ? [...current, event]
                            : current.filter((value) => value !== event)
                        )
                      }
                      className="h-3.5 w-3.5 accent-[#6C47FF]"
                    />
                    <span className="flex-1">{EVENT_LABELS[event]}</span>
                    <code className="text-[10.5px] text-[#4A4A5C]">{event}</code>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>}

            <button
              onClick={create}
              disabled={busy || !url}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#6C47FF] px-5 text-[13px] font-semibold text-white hover:bg-[#7C5AFF] disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save endpoint
            </button>
          </div>
        )}

        <div className="mt-4">
          {!endpoints ? (
            <SkeletonRows rows={3} columns={4} />
          ) : endpoints.length === 0 ? (
            <EmptyState
              icon="🔗"
              title="No endpoints yet"
              description="Add one and every registration, attendance and purchase is delivered to it within seconds."
            />
          ) : (
            <ul className="space-y-2">
              {endpoints.map((endpoint) => (
                <li
                  key={endpoint.id}
                  className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-white">
                        {endpoint.description || endpoint.url}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11.5px] text-[#6E6E80]">
                        {endpoint.url}
                      </p>
                      <p className="mt-1.5 text-[11.5px] text-[#6E6E80]">
                        {endpoint.events.length === 0
                          ? "All events"
                          : `${endpoint.events.length} event${endpoint.events.length === 1 ? "" : "s"}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => test(endpoint.id)}
                        disabled={testing === endpoint.id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#1E1E2E] px-2.5 text-[12px] text-[#A0A0B0] transition-colors hover:text-white disabled:opacity-40"
                      >
                        {testing === endpoint.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Test
                      </button>
                      <button
                        onClick={() => remove(endpoint.id)}
                        aria-label="Delete endpoint"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#1E1E2E] text-[#A0A0B0] transition-colors hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-[#1E1E2E] pt-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#6E6E80]">
                      Signing secret
                      <HelpTooltip content="Verify a request is from Loopinglive by computing an HMAC-SHA256 of the raw request body with this secret, and comparing it to the X-Loopinglive-Signature header." />
                    </span>
                    <code className="truncate font-mono text-[11px] text-[#00D4FF]">
                      {endpoint.secret.slice(0, 12)}…
                    </code>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(endpoint.secret);
                        toast.success("Signing secret copied.");
                      }}
                      className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-[#A0A0B0] hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold text-white">Recent deliveries</h2>

        {logs.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon="📡"
            title="No deliveries yet"
            description="Once an endpoint is set up, every attempt shows here with its response code."
          />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#1E1E2E]">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#12121A]">
                <tr>
                  {["Event", "Status", "Response", "Attempts", "When"].map((h) => (
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
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-mono text-[12px] text-white">
                      {log.event_type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          color: STATUS_COLOUR[log.status] ?? "#A0A0B0",
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        {log.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {log.response_status ?? (log.error_message ? "—" : "")}
                      {log.error_message && (
                        <span className="ml-2 text-[11.5px] text-[#6E6E80]">
                          {log.error_message.slice(0, 60)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {log.attempt_count}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#6E6E80]">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
