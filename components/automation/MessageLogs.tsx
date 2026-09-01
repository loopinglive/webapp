"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  RotateCw,
  Search,
  Smartphone,
} from "lucide-react";

import { AdminButton } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { useMessageLogs } from "@/hooks/useMessageLogs";
import { TEMPLATE_BY_KEY } from "@/lib/messaging/defaults";
import { cn } from "@/lib/utils";
import type { MessageChannel } from "@/types/database";

const STATUS_STYLE: Record<string, { label: string; colour: string }> = {
  sent: { label: "Sent", colour: "#00C851" },
  pending: { label: "Pending", colour: "#6C47FF" },
  failed: { label: "Failed", colour: "#FF3B3B" },
  failed_permanently: { label: "Failed", colour: "#FF3B3B" },
  cancelled: { label: "Cancelled", colour: "#FF9500" },
};

const CHANNEL_ICON: Record<MessageChannel, typeof Mail> = {
  email: Mail,
  sms: Smartphone,
  whatsapp: MessageCircle,
};

export function MessageLogs({ webinarId }: { webinarId: string }) {
  const logs = useMessageLogs(webinarId);
  const [exporting, setExporting] = useState(false);

  /** Fetched rather than linked: the route needs the admin's session cookie. */
  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        webinarId,
        channel: logs.channel,
        status: logs.status,
      });
      const response = await fetch(`/api/admin/automation/export?${params}`);
      if (!response.ok) return;

      const blob = await response.blob();
      const name =
        (response.headers.get("Content-Disposition") ?? "").match(
          /filename="(.+?)"/
        )?.[1] ?? "messages.csv";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <SectionHeader
        title="Delivery logs"
        description="Every message this webinar has queued, sent, cancelled or failed."
        action={
          <Link
            href={`/admin/webinar/${webinarId}/automation`}
            className="inline-flex items-center gap-2 text-[13px] text-[#A0A0B0] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Automation
          </Link>
        }
      />

      <div className="space-y-5 px-6 py-6 lg:px-8">
        {/* Stats */}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Sent", value: logs.stats.sent, tone: "#00C851" },
            { label: "Pending", value: logs.stats.pending, tone: "#6C47FF" },
            {
              label: "Failed",
              value: logs.stats.failed,
              tone: logs.stats.failed ? "#FF3B3B" : undefined,
            },
            { label: "Cancelled", value: logs.stats.cancelled, tone: "#FF9500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5"
            >
              <dt
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: stat.tone ?? "#A0A0B0" }}
              >
                {stat.label}
              </dt>
              <dd className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-white">
                {stat.value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[190px] flex-1 items-center gap-2 rounded-full border border-[#1E1E2E] bg-[#12121A] px-4 py-2 focus-within:border-[#6C47FF]/60">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#A0A0B0]" />
            <input
              value={logs.search}
              onChange={(event) => logs.setSearch(event.target.value)}
              placeholder="Search recipient"
              aria-label="Search recipient"
              className="w-full bg-transparent text-[12.5px] text-white placeholder:text-[#A0A0B0]/60 focus:outline-none"
            />
          </div>

          <Segmented
            value={logs.channel}
            onChange={logs.setChannel}
            options={[
              { id: "all", label: "All" },
              { id: "email", label: "Email" },
              { id: "sms", label: "SMS" },
              { id: "whatsapp", label: "WhatsApp" },
            ]}
          />

          <Segmented
            value={logs.status}
            onChange={logs.setStatus}
            options={[
              { id: "all", label: "All" },
              { id: "sent", label: "Sent" },
              { id: "pending", label: "Pending" },
              { id: "failed", label: "Failed" },
              { id: "cancelled", label: "Cancelled" },
            ]}
          />

          <AdminButton variant="secondary" onClick={exportCsv} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export CSV
          </AdminButton>
        </div>

        {/* Table */}
        {logs.isLoading ? (
          <div className="grid place-items-center rounded-xl border border-[#1E1E2E] py-20">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : !logs.logs.length ? (
          <p className="rounded-xl border border-dashed border-[#3A3A4A] px-6 py-16 text-center text-[13.5px] text-[#A0A0B0]">
            Nothing queued yet. Messages appear here as soon as someone registers.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#1E1E2E]">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-[#1E1E2E] bg-[#12121A] text-left">
                  {["Recipient", "Channel", "Message", "Status", "Scheduled", "Sent", ""].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#1E1E2E]">
                {logs.logs.map((log) => {
                  const style = STATUS_STYLE[log.status] ?? STATUS_STYLE.pending;
                  const Icon = CHANNEL_ICON[log.channel];
                  const failed = log.status.startsWith("failed");

                  return (
                    <tr key={log.id} className="bg-[#0D0D17]">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/webinar/${webinarId}/attendees/${log.registrant_id}`}
                          className="text-[12.5px] text-white transition-colors hover:text-[#6C47FF]"
                        >
                          {log.recipient_name ?? "—"}
                        </Link>
                        <p className="truncate text-[11px] text-[#A0A0B0]">
                          {log.channel === "email"
                            ? log.recipient_email
                            : log.recipient_phone}
                        </p>
                      </td>

                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-[#A0A0B0]">
                          <Icon className="h-3.5 w-3.5" />
                          {log.channel}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 text-[12.5px] text-[#A0A0B0]">
                        {TEMPLATE_BY_KEY.get(log.template_key ?? "")?.label ??
                          log.template_key}
                      </td>

                      <td className="px-4 py-2.5">
                        <span
                          title={log.error_message ?? undefined}
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                          style={{
                            background: `${style.colour}20`,
                            color: style.colour,
                          }}
                        >
                          {style.label}
                        </span>
                        {log.error_message && (
                          <p className="mt-1 max-w-[200px] truncate text-[10.5px] text-[#A0A0B0]">
                            {log.error_message}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 text-[11.5px] tabular-nums text-[#A0A0B0]">
                        {new Date(log.scheduled_for).toLocaleString()}
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 text-[11.5px] tabular-nums text-[#A0A0B0]">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : "—"}
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        {failed && (
                          <button
                            onClick={() => void logs.retry(log.id)}
                            title="Retry now"
                            aria-label="Retry"
                            className="grid h-7 w-7 place-items-center rounded-lg text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {logs.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-[#A0A0B0]">
              Page {logs.page} of {logs.totalPages} · {logs.total} messages
            </span>
            <div className="flex items-center gap-2">
              <AdminButton
                variant="secondary"
                disabled={logs.page <= 1}
                onClick={() => logs.setPage(logs.page - 1)}
              >
                Previous
              </AdminButton>
              <AdminButton
                variant="secondary"
                disabled={logs.page >= logs.totalPages}
                onClick={() => logs.setPage(logs.page + 1)}
              >
                Next
              </AdminButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-[#1E1E2E] bg-[#12121A] p-1">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] transition-colors",
            value === option.id
              ? "bg-[#6C47FF] text-white"
              : "text-[#A0A0B0] hover:text-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
