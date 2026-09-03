"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Flag, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";

type Report = {
  id: string;
  webinar_id: string;
  webinar_title: string | null;
  owner_id: string | null;
  owner_email: string | null;
  owner_plan: string | null;
  reason: string;
  detail: string | null;
  created_at: string;
  reports_for_webinar: number;
  registrants_reached: number;
};

const REASON_LABELS: Record<string, string> = {
  misleading_claims: "Misleading claims",
  scam_or_fraud: "Possible scam",
  not_live: "Presented as live",
  impersonation: "Impersonation",
  offensive: "Offensive content",
  other: "Other",
};

/**
 * The queue.
 *
 * Ordered newest first, but the numbers that decide what to look at are the
 * two on the right: how many people have reported this webinar, and how many
 * people it has reached. A single report about something nobody attended is a
 * different problem from a ninth report about something with four thousand
 * registrants.
 */
export function ReportQueue() {
  const toast = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [status, setStatus] = useState("open");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/superadmin/reports?status=${status}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { reports: Report[] };
    setReports(payload.reports);
  }, [status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const resolve = useCallback(
    async (report: Report, action: "dismiss" | "action", unpublish: boolean) => {
      const resolution = window.prompt(
        action === "dismiss"
          ? "Why is this being dismissed? (recorded)"
          : "What was done? (recorded)"
      );
      if (resolution === null) return;

      setBusy(report.id);
      const response = await fetch("/api/superadmin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          action,
          resolution,
          unpublish,
        }),
      });
      setBusy(null);

      if (!response.ok) {
        toast.error("That did not work.");
        return;
      }
      toast.success(unpublish ? "Taken down." : "Resolved.");
      await load();
    },
    [load, toast]
  );

  return (
    <div className="space-y-4 px-6 py-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-1.5">
        {(["open", "actioned", "dismissed"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={`h-8 rounded-full px-3 text-[12.5px] capitalize transition-colors ${
              status === value
                ? "bg-[#6C47FF] text-white"
                : "text-[#A0A0B0] hover:text-white"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {!reports ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title={status === "open" ? "Nothing waiting" : "Nothing here"}
          description={
            status === "open"
              ? "No open reports. This is the state you want it in."
              : "Nothing has been resolved this way yet."
          }
        />
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13.5px] font-medium text-white">
                    <Flag className="h-3.5 w-3.5 shrink-0 text-[#F5A623]" />
                    {REASON_LABELS[report.reason] ?? report.reason}
                  </p>
                  <p className="mt-1 text-[12.5px] text-[#A0A0B0]">
                    {report.webinar_title ?? "(deleted webinar)"}
                    {report.owner_email && (
                      <>
                        {" · "}
                        {report.owner_id ? (
                          <Link
                            href={`/superadmin/users/${report.owner_id}`}
                            className="text-[#00D4FF] hover:underline"
                          >
                            {report.owner_email}
                          </Link>
                        ) : (
                          report.owner_email
                        )}
                        {report.owner_plan && (
                          <span className="text-[#6E6E80]"> ({report.owner_plan})</span>
                        )}
                      </>
                    )}
                  </p>
                </div>

                <div className="shrink-0 text-right text-[11.5px] text-[#6E6E80]">
                  <p>
                    <span className="text-white">{report.reports_for_webinar}</span>{" "}
                    {report.reports_for_webinar === 1 ? "report" : "reports"}
                  </p>
                  <p>
                    <span className="text-white">
                      {report.registrants_reached.toLocaleString()}
                    </span>{" "}
                    reached
                  </p>
                </div>
              </div>

              {report.detail && (
                <p className="mt-2.5 whitespace-pre-wrap rounded-lg bg-[#0D0D15] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#C4C4D0]">
                  {report.detail}
                </p>
              )}

              {status === "open" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => void resolve(report, "action", true)}
                    disabled={busy === report.id}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#FF5A5A] px-3 text-[12px] font-medium text-white hover:bg-[#E64A4A] disabled:opacity-60"
                  >
                    {busy === report.id && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    Take the webinar down
                  </button>
                  <button
                    onClick={() => void resolve(report, "action", false)}
                    disabled={busy === report.id}
                    className="h-8 rounded-lg border border-[#1E1E2E] px-3 text-[12px] text-[#A0A0B0] hover:text-white disabled:opacity-60"
                  >
                    Handled another way
                  </button>
                  <button
                    onClick={() => void resolve(report, "dismiss", false)}
                    disabled={busy === report.id}
                    className="h-8 rounded-lg px-3 text-[12px] text-[#6E6E80] hover:text-white disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                  <Link
                    href={`/webinar/${report.webinar_id}/register`}
                    target="_blank"
                    className="ml-auto h-8 rounded-lg px-3 text-[12px] leading-8 text-[#00D4FF] hover:underline"
                  >
                    See what they see
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
