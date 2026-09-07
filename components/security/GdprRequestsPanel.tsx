"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";

type GdprRequest = {
  id: string;
  requester_email: string;
  request_type: "access" | "erasure" | "marketing_objection";
  status: string;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
};

const TYPE_LABEL: Record<GdprRequest["request_type"], string> = {
  access: "Access their data",
  erasure: "Delete their data",
  marketing_objection: "Stop marketing",
};

export function GdprRequestsPanel({ webinarId }: { webinarId: string }) {
  const toast = useToast();
  const [requests, setRequests] = useState<GdprRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/gdpr/process?webinarId=${webinarId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { requests: GdprRequest[] };
      setRequests(payload.requests);
    } else {
      setRequests([]);
    }
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function process(id: string, action: "access" | "erasure" | "marketing_objection" | "reject") {
    if (action === "erasure" && !window.confirm("This permanently deletes this attendee's data. Continue?")) {
      return;
    }
    setBusyId(id);
    try {
      const response = await fetch("/api/gdpr/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, action }),
      });
      const payload = (await response.json()) as { error?: string; notes?: string; export?: unknown };
      if (!response.ok) {
        toast.error(payload.error ?? "Could not process that request.");
        return;
      }
      if (action === "access" && payload.export) {
        const blob = new Blob([JSON.stringify(payload.export, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "attendee-data-export.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      toast.success(payload.notes ?? "Processed.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const pending = (requests ?? []).filter((request) => request.status !== "completed");
  const done = (requests ?? []).filter((request) => request.status === "completed");

  if (!requests) {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[15px] font-semibold text-ink">Pending requests</h2>
        {pending.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon="✅"
            title="Nothing pending"
            description="When an attendee asks to see, delete, or stop receiving marketing about their data, it appears here."
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {pending.map((request) => (
              <li key={request.id} className="rounded-xl border border-hairline bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{request.requester_email}</p>
                    <p className="mt-0.5 text-[12px] text-ink-faint">
                      {TYPE_LABEL[request.request_type]} ·{" "}
                      {new Date(request.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => process(request.id, request.request_type)}
                      disabled={busyId === request.id}
                      className="inline-flex h-8 items-center rounded-lg bg-accent px-3 text-[12px] font-medium text-white disabled:opacity-40"
                    >
                      Process
                    </button>
                    <button
                      onClick={() => process(request.id, "reject")}
                      disabled={busyId === request.id}
                      className="inline-flex h-8 items-center rounded-lg border border-hairline px-3 text-[12px] text-ink-muted hover:text-ink disabled:opacity-40"
                    >
                      No match
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-ink">Processed</h2>
          <ul className="mt-4 space-y-1.5">
            {done.map((request) => (
              <li key={request.id} className="flex items-center justify-between text-[12px] text-ink-faint">
                <span>{request.requester_email}</span>
                <span>{TYPE_LABEL[request.request_type]}</span>
                <span>{request.notes}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
