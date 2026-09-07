"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";

type LogEntry = {
  id: string;
  user_id: string | null;
  team_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
};

/** One line per action: what happened, to what, and from where. */
export function AuditLogViewer({ teamId }: { teamId?: string }) {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (teamId) params.set("teamId", teamId);
    if (actionFilter) params.set("action", actionFilter);

    const response = await fetch(`/api/audit/log?${params}`, { cache: "no-store" });
    const payload = (await response.json()) as { logs?: LogEntry[]; error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Could not load the audit log.");
      setLogs([]);
      return;
    }
    setError(null);
    setLogs(payload.logs ?? []);
  }, [teamId, actionFilter]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (teamId) params.set("teamId", teamId);
    if (actionFilter) params.set("action", actionFilter);
    params.set("format", "csv");
    window.open(`/api/audit/log?${params}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="block">
          <span className="sr-only">Filter by action</span>
          <input
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            placeholder="Filter by action, e.g. webinar.created"
            className="h-9 w-64 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[12.5px] text-white placeholder:text-[#6E6E80] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C47FF]"
          />
        </label>
        <button
          onClick={exportCsv}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C47FF]"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {!logs ? (
        <SkeletonRows rows={5} columns={5} />
      ) : error ? (
        <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>
      ) : logs.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Nothing logged yet"
          description="Every significant action — creating a webinar, changing a team member's role, exporting data — appears here as it happens."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1E1E2E]">
          <table className="w-full min-w-[720px]">
            <thead className="bg-[#12121A]">
              <tr>
                {["When", "Action", "Resource", "IP address"].map((h) => (
                  <th
                    key={h}
                    scope="col"
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
                  <td className="px-4 py-3 text-[12px] text-[#6E6E80]">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-white">{log.action}</td>
                  <td className="px-4 py-3 text-[12.5px] text-[#A0A0B0]">
                    {log.resource_type}
                    {log.resource_id && (
                      <span className="ml-1.5 font-mono text-[11px] text-[#6E6E80]">
                        {log.resource_id.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[#6E6E80]">
                    {log.ip_address ?? "—"}
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
