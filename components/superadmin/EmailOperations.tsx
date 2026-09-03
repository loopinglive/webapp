"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Mail, RotateCw } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows, SkeletonTiles } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";

type ChannelStat = {
  channel: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  cancelled: number;
  abandoned: number;
  failureRate: number;
};

type Message = {
  id: string;
  channel: string;
  status: string;
  template_key: string | null;
  subject: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  error_message: string | null;
  scheduled_for: string;
  sent_at: string | null;
  attempts: number;
  webinarTitle: string | null;
};

type Payload = {
  days: number;
  channels: ChannelStat[];
  totals: { queued: number; sent: number; failed: number; unsubscribes: number };
  failuresByTemplate: {
    template: string;
    channel: string;
    count: number;
    sample: string | null;
  }[];
  messages: Message[];
};

const STATUS_COLOUR: Record<string, string> = {
  sent: "#00C851",
  pending: "#00D4FF",
  failed: "#FFB020",
  failed_permanently: "#FF5A5A",
  cancelled: "#6E6E80",
};

const RANGES = [7, 30, 90];

/**
 * Sending, seen from above.
 *
 * The per-user log answers what happened to one customer. This answers whether
 * sending works at all — and it is the screen that would have shown, weeks
 * earlier, that a suppressed address was silently swallowing every message.
 */
export function EmailOperations() {
  const toast = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [days, setDays] = useState(30);
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ days: String(days), channel, status });
    const response = await fetch(`/api/superadmin/email?${params}`, {
      cache: "no-store",
    });
    if (response.ok) setData((await response.json()) as Payload);
  }, [days, channel, status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function retry(id: string) {
    setRetrying(id);
    const response = await fetch("/api/superadmin/email/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = (await response.json()) as { outcome?: string; error?: string };
    setRetrying(null);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not resend.");
      return;
    }

    // The dispatcher re-checks every rule, so "cancelled" is a legitimate
    // outcome and worth saying out loud rather than reporting success.
    if (payload.outcome === "sent") toast.success("Sent.");
    else if (payload.outcome === "cancelled")
      toast.warning("Not sent — the recipient no longer qualifies for it.");
    else toast.warning(`Dispatcher returned "${payload.outcome}".`);

    await load();
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <SkeletonTiles count={4} />
        <SkeletonRows rows={8} columns={5} />
      </div>
    );
  }

  const email = data.channels.find((c) => c.channel === "email");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border border-[#1E1E2E] bg-[#12121A] p-1">
          {RANGES.map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] transition-colors",
                days === option ? "bg-[#6C47FF] text-white" : "text-[#A0A0B0] hover:text-white"
              )}
            >
              {option} days
            </button>
          ))}
        </div>

        <select
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          className="h-8 rounded-full border border-[#1E1E2E] bg-[#12121A] px-3 text-[12.5px] text-white focus:outline-none"
        >
          <option value="all">All channels</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-8 rounded-full border border-[#1E1E2E] bg-[#12121A] px-3 text-[12.5px] text-white focus:outline-none"
        >
          <option value="all">Any status</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="failed_permanently">Given up</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Sent" value={data.totals.sent.toLocaleString()} />
        <Tile label="Queued" value={data.totals.queued.toLocaleString()} />
        <Tile
          label="Failed"
          value={data.totals.failed.toLocaleString()}
          accent={data.totals.failed > 0 ? "#FF6B6B" : undefined}
        />
        <Tile
          label="Unsubscribed"
          value={data.totals.unsubscribes.toLocaleString()}
          hint="all time"
        />
      </div>

      {/* Per channel */}
      <section>
        <h2 className="text-[15px] font-semibold text-white">By channel</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {data.channels.map((row) => (
            <div
              key={row.channel}
              className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium capitalize text-white">
                  {row.channel}
                </span>
                <span
                  className="text-[12px] tabular-nums"
                  style={{ color: row.failureRate > 5 ? "#FF6B6B" : "#00C851" }}
                >
                  {row.total === 0 ? "—" : `${row.failureRate}% failed`}
                </span>
              </div>

              <dl className="mt-3 space-y-1 text-[11.5px]">
                {[
                  ["Sent", row.sent, "#00C851"],
                  ["Pending", row.pending, "#00D4FF"],
                  ["Failed", row.failed, "#FFB020"],
                  ["Given up", row.abandoned, "#FF5A5A"],
                  ["Cancelled", row.cancelled, "#6E6E80"],
                ].map(([label, value, colour]) => (
                  <div key={String(label)} className="flex justify-between">
                    <dt className="text-[#6E6E80]">{label}</dt>
                    <dd className="tabular-nums" style={{ color: colour as string }}>
                      {Number(value).toLocaleString()}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        {email && email.total === 0 && (
          <p className="mt-3 text-[12.5px] text-[#6E6E80]">
            No messages queued in this window. Automation only schedules messages once a
            webinar has registrants.
          </p>
        )}
      </section>

      {/* Failures by template */}
      {data.failuresByTemplate.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
            <AlertTriangle className="h-4 w-4 text-[#FFB020]" />
            Failures by template
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[#6E6E80]">
            Grouped so one broken template is obvious rather than diluted across the
            total.
          </p>

          <ul className="mt-3 space-y-1.5">
            {data.failuresByTemplate.map((row) => (
              <li
                key={`${row.template}-${row.channel}`}
                className="flex items-start gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
              >
                <span className="shrink-0 rounded-md bg-[#FFB020]/12 px-2 py-0.5 font-mono text-[11px] tabular-nums text-[#FFB020]">
                  {row.count}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[12.5px] text-white">
                    {row.template}
                    <span className="ml-2 text-[11px] capitalize text-[#6E6E80]">
                      {row.channel}
                    </span>
                  </p>
                  {row.sample && (
                    <p className="mt-0.5 truncate text-[11.5px] text-[#FF6B6B]">
                      {row.sample}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent */}
      <section>
        <h2 className="text-[15px] font-semibold text-white">Recent messages</h2>

        {data.messages.length === 0 ? (
          <EmptyState
            className="mt-3"
            icon="📭"
            title="Nothing in this window"
            description="Messages appear here as automation schedules and sends them. Try widening the range or clearing the filters."
          />
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-[#1E1E2E]">
            <table className="w-full min-w-[880px]">
              <thead className="bg-[#12121A]">
                <tr>
                  {["When", "Channel", "Template", "Recipient", "Webinar", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E2E]">
                {data.messages.map((message) => (
                  <tr key={message.id}>
                    <td className="px-4 py-3 text-[11.5px] text-[#6E6E80]">
                      {new Date(message.sent_at ?? message.scheduled_for).toLocaleString(
                        undefined,
                        { dateStyle: "short", timeStyle: "short" }
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] capitalize text-[#A0A0B0]">
                      {message.channel}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11.5px] text-[#A0A0B0]">
                      {message.template_key ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[11.5px] text-[#6E6E80]">
                      {message.recipient_email ?? message.recipient_phone ?? "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-[11.5px] text-[#6E6E80]">
                      {message.webinarTitle ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11.5px]"
                        style={{ color: STATUS_COLOUR[message.status] ?? "#A0A0B0" }}
                      >
                        {message.status.replace(/_/g, " ")}
                      </span>
                      {message.error_message && (
                        <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-[#FF6B6B]">
                          {message.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {message.status !== "sent" && message.status !== "pending" && (
                        <button
                          onClick={() => retry(message.id)}
                          disabled={retrying === message.id}
                          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#1E1E2E] px-2 text-[11.5px] text-[#A0A0B0] hover:text-white disabled:opacity-40"
                        >
                          {retrying === message.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCw className="h-3 w-3" />
                          )}
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[#6E6E80]">
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Retrying hands the message back to the normal dispatcher, so every rule still
          applies — someone who has since unsubscribed, bought, or attended will not be
          messaged again. Bounced addresses are suppressed by Resend and cannot be
          resent to at all; check{" "}
          <Link href="/superadmin/health" className="text-[#6C47FF]">
            Platform health
          </Link>{" "}
          for provider status.
        </span>
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
        {label}
      </p>
      <p
        className="mt-1.5 text-[22px] font-semibold tabular-nums tracking-[-0.02em]"
        style={{ color: accent ?? "#FFFFFF" }}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-[#6E6E80]">{hint}</p>}
    </div>
  );
}
