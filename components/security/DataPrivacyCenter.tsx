"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

type ExportRequest = {
  id: string;
  request_type: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
};

export function DataPrivacyCenter() {
  const toast = useToast();
  const [requests, setRequests] = useState<ExportRequest[]>([]);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/gdpr/export", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { requests: ExportRequest[] };
      setRequests(payload.requests);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function exportData() {
    setExporting(true);
    try {
      const response = await fetch("/api/gdpr/export", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(payload.error ?? "Could not generate your export.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "loopinglive-my-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data export has downloaded.");
      await load();
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const response = await fetch("/api/gdpr/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Could not submit the deletion request.");
        return;
      }
      toast.success(payload.message ?? "Deletion request received.");
      setConfirmingDelete(false);
      setConfirmText("");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="glass rounded-panel p-6">
        <h2 className="text-[15px] font-semibold text-ink">What we collect about you</h2>
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-muted">
          Your name, email, and billing details, plus the webinars, teams, and
          integrations you set up. Full detail is in our{" "}
          <a href="/privacy" className="text-accent hover:text-accent-soft">
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section className="glass rounded-panel p-6">
        <h2 className="text-[15px] font-semibold text-ink">Download your data</h2>
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-muted">
          Everything tied to your account — your profile, webinars, teams,
          webhooks, API keys, invoices — as a single JSON file.
        </p>
        <button
          onClick={exportData}
          disabled={exporting}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download all my data
        </button>

        {requests.length > 0 && (
          <ul className="mt-5 space-y-1.5 border-t border-hairline pt-4">
            {requests.map((req) => (
              <li key={req.id} className="flex items-center justify-between text-[12px] text-ink-faint">
                <span className="capitalize">{req.request_type}</span>
                <span className="capitalize">{req.status}</span>
                <span>
                  {new Date(req.requested_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-panel p-6">
        <h2 className="text-[15px] font-semibold text-ink">Delete my account</h2>
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-muted">
          Permanently removes your webinars, teams you own, and profile.
          Invoices are kept for 7 years, as UK tax law requires. Processed
          within 30 days of your request.
        </p>

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-[#FF5A5A]/40 px-5 text-[13px] font-semibold text-[#FF5A5A] transition-colors hover:bg-[#FF5A5A]/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Request account deletion
          </button>
        ) : (
          <div className="mt-4 max-w-sm rounded-xl border border-[#FF5A5A]/30 bg-[#FF5A5A]/5 p-4">
            <label className="block text-[12.5px] text-ink-muted">
              Type <strong className="text-ink">DELETE</strong> to confirm
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                onClick={deleteAccount}
                disabled={confirmText !== "DELETE" || deleting}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#FF5A5A] px-4 text-[12.5px] font-semibold text-white disabled:opacity-40"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm deletion
              </button>
              <button
                onClick={() => {
                  setConfirmingDelete(false);
                  setConfirmText("");
                }}
                className="inline-flex h-9 items-center rounded-full border border-hairline px-4 text-[12.5px] text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
