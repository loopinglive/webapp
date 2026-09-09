"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Power } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

type Status = {
  enabled: boolean;
  message: string;
  changedAt: string | null;
  forcedByEnv: boolean;
};

/**
 * Taking the site down on purpose, and putting it back.
 *
 * A toggle rather than a redeploy: needing a deploy to stop serving is exactly
 * wrong when the reason you are stopping is that the last deploy was bad.
 */
export function MaintenanceToggle() {
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/superadmin/maintenance", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as Status;
    setStatus(payload);
    setMessage(payload.message);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const apply = useCallback(
    async (enabled: boolean) => {
      setBusy(true);
      const response = await fetch("/api/superadmin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, message: message.trim() || undefined }),
      });
      setBusy(false);
      setConfirming(false);

      if (!response.ok) {
        toast.error("Could not change that.");
        return;
      }

      toast.success(
        enabled ? "The site is now showing maintenance." : "The site is live again."
      );
      await load();
    },
    [message, load, toast]
  );

  if (!status) return null;

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Power
              className={`h-4 w-4 ${
                status.enabled ? "text-[#FF5A5A]" : "text-[#22C55E]"
              }`}
            />
            {status.enabled ? "Down for maintenance" : "Serving normally"}
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-faint">
            Attendee pages, registration and the API return a maintenance
            response. This console, the login page, scheduled jobs and incoming
            webhooks keep working — so you can get back in, and so the sessions
            you are not touching still run.
          </p>
        </div>

        {!status.forcedByEnv &&
          (status.enabled ? (
            <button
              onClick={() => void apply(false)}
              disabled={busy}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[#22C55E] px-3.5 text-[12.5px] font-medium text-black hover:bg-[#1FAF52] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Bring the site back
            </button>
          ) : confirming ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => void apply(true)}
                disabled={busy}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#FF5A5A] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#E64A4A] disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Yes, take it down
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="h-9 rounded-lg px-2.5 text-[12.5px] text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-hairline px-3.5 text-[12.5px] text-ink-muted hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
            >
              Take the site down
            </button>
          ))}
      </div>

      {status.forcedByEnv && (
        <p className="mt-3 rounded-lg bg-[#F5A623]/10 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#F5A623]">
          MAINTENANCE_MODE is set in the environment, which overrides this
          toggle. Clear it in your hosting config to take back control from
          here.
        </p>
      )}

      <label className="mt-4 block">
        <span className="text-[12px] text-ink-muted">
          What visitors see while it is down
        </span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={2}
          placeholder="We are carrying out planned maintenance and will be back shortly."
          className="mt-1.5 w-full rounded-xl border border-hairline bg-void px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <span className="mt-1 block text-[11px] text-ink-faint">
          &ldquo;Back at 3pm UTC after a database migration&rdquo; is a much
          better thing to read than &ldquo;back shortly&rdquo;, and it can only
          be written by someone who knows.
        </span>
      </label>

      <p className="mt-3 text-[11px] text-ink-faint">
        Takes up to 30 seconds to reach every request — the flag is cached
        rather than read on every page load.
      </p>
    </section>
  );
}
