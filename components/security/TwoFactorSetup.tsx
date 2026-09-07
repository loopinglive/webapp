"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, Loader2, ShieldCheck } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

type Status = { enabled: boolean; enabledAt: string | null; recoveryCodesLeft: number };

/** Same TOTP flow as the super admin console's, at /api/settings/2fa instead. */
export function TwoFactorSetup() {
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/settings/2fa", { cache: "no-store" });
    if (!response.ok) return;
    setStatus((await response.json()) as Status);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const begin = useCallback(async () => {
    setBusy(true);
    const response = await fetch("/api/settings/2fa", { method: "POST" });
    const payload = (await response.json()) as { secret?: string; qr?: string; error?: string };
    setBusy(false);

    if (!response.ok || !payload.secret || !payload.qr) {
      toast.error(payload.error ?? "Could not start.");
      return;
    }
    setSetup({ secret: payload.secret, qr: payload.qr });
  }, [toast]);

  const confirm = useCallback(async () => {
    setBusy(true);
    const response = await fetch("/api/settings/2fa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const payload = (await response.json()) as { recoveryCodes?: string[]; error?: string };
    setBusy(false);

    if (!response.ok || !payload.recoveryCodes) {
      toast.error(payload.error ?? "That code is not right.");
      return;
    }

    setRecovery(payload.recoveryCodes);
    setSetup(null);
    setCode("");
    await load();
  }, [code, load, toast]);

  const disable = useCallback(async () => {
    const supplied = window.prompt("Enter a current code from your authenticator, or one of your recovery codes:");
    if (!supplied?.trim()) return;

    setBusy(true);
    const response = await fetch("/api/settings/2fa", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: supplied.trim() }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (!response.ok) {
      toast.error(payload.error ?? "That code is not right.");
      return;
    }
    toast.success("Two-factor is off.");
    await load();
  }, [load, toast]);

  if (!status) return null;

  if (recovery) {
    return (
      <section className="rounded-2xl border border-[#22C55E]/40 bg-[#22C55E]/[0.06] p-5">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Check className="h-4 w-4 text-[#22C55E]" />
          Two-factor is on. Save these now.
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
          These are the way back in if you lose your phone. They are not shown
          again — only their hashes are stored.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-void p-3 font-mono text-[12.5px] text-ink sm:grid-cols-3">
          {recovery.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              void navigator.clipboard.writeText(recovery.join("\n"));
              toast.success("Copied.");
            }}
            className="h-9 rounded-lg border border-hairline px-3 text-[12.5px] text-ink-muted hover:text-ink"
          >
            Copy all
          </button>
          <button
            onClick={() => setRecovery(null)}
            className="h-9 rounded-lg bg-surface-2 px-3 text-[12.5px] text-ink hover:bg-surface-3"
          >
            I have saved them
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <ShieldCheck className={`h-4 w-4 ${status.enabled ? "text-[#22C55E]" : "text-[#F5A623]"}`} />
        Two-factor authentication
      </h2>

      {status.enabled ? (
        <>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">
            On since{" "}
            {status.enabledAt
              ? new Date(status.enabledAt).toLocaleDateString(undefined, { dateStyle: "medium" })
              : "recently"}
            . {status.recoveryCodesLeft} recovery codes stored.
          </p>
          <button
            onClick={() => void disable()}
            disabled={busy}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-hairline px-3 text-[12.5px] text-ink-muted hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Turn it off
          </button>
        </>
      ) : setup ? (
        <>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">
            Scan this with your authenticator app, then enter the code it shows.
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <Image
              src={setup.qr}
              alt="Two-factor setup QR code"
              width={180}
              height={180}
              unoptimized
              className="rounded-lg bg-white p-2"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] text-ink-faint">Or enter this by hand:</p>
              <code className="mt-1 block break-all rounded-lg bg-void px-3 py-2 font-mono text-[12px] text-ink">
                {setup.secret}
              </code>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void confirm();
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                aria-label="Six-digit code"
                className="mt-3 h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 font-mono text-[16px] tracking-[0.3em] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => void confirm()}
                  disabled={busy || code.length < 6}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-[12.5px] font-medium text-white hover:bg-accent-soft disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Turn it on
                </button>
                <button
                  onClick={() => {
                    setSetup(null);
                    setCode("");
                  }}
                  className="h-9 rounded-lg px-3 text-[12.5px] text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1.5 max-w-[60ch] text-[12px] leading-relaxed text-ink-faint">
            Add a second step to your login, on top of your password, using any
            authenticator app.
          </p>
          <button
            onClick={() => void begin()}
            disabled={busy}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-[12.5px] font-medium text-white hover:bg-accent-soft disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Set it up
          </button>
        </>
      )}
    </section>
  );
}
