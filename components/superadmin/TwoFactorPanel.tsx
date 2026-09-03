"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, Loader2, ShieldCheck } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

type Status = {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesLeft: number;
};

/**
 * Turning on a second factor for this admin account.
 *
 * The console can issue refunds and impersonate customers, and everything else
 * added around it — roles, audit entries, a reason required before
 * impersonating — assumes the person signed in is who they say they are.
 * Nothing was checking that beyond one reusable password.
 */
export function TwoFactorPanel() {
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/superadmin/2fa", { cache: "no-store" });
    if (!response.ok) return;
    setStatus((await response.json()) as Status);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const begin = useCallback(async () => {
    setBusy(true);
    const response = await fetch("/api/superadmin/2fa", { method: "POST" });
    const payload = (await response.json()) as {
      secret?: string;
      qr?: string;
      error?: string;
    };
    setBusy(false);

    if (!response.ok || !payload.secret || !payload.qr) {
      toast.error(payload.error ?? "Could not start.");
      return;
    }
    setSetup({ secret: payload.secret, qr: payload.qr });
  }, [toast]);

  const confirm = useCallback(async () => {
    setBusy(true);
    const response = await fetch("/api/superadmin/2fa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const payload = (await response.json()) as {
      recoveryCodes?: string[];
      error?: string;
    };
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
    const supplied = window.prompt(
      "Enter a current code from your authenticator, or one of your recovery codes:"
    );
    if (!supplied?.trim()) return;

    setBusy(true);
    const response = await fetch("/api/superadmin/2fa", {
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

  // Shown once, and only once — only their hashes are kept.
  if (recovery) {
    return (
      <section className="rounded-2xl border border-[#22C55E]/40 bg-[#22C55E]/[0.06] p-5">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white">
          <Check className="h-4 w-4 text-[#22C55E]" />
          Two-factor is on. Save these now.
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#A0A0B0]">
          These are the way back in if you lose your phone. They are not shown
          again — only their hashes are stored, so nobody here can look them up
          for you.
        </p>

        <ul className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-[#0A0A0F] p-3 font-mono text-[12.5px] text-white sm:grid-cols-3">
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
            className="h-9 rounded-lg border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] hover:text-white"
          >
            Copy all
          </button>
          <button
            onClick={() => setRecovery(null)}
            className="h-9 rounded-lg bg-[#1E1E2E] px-3 text-[12.5px] text-white hover:bg-[#2A2A3A]"
          >
            I have saved them
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white">
        <ShieldCheck
          className={`h-4 w-4 ${status.enabled ? "text-[#22C55E]" : "text-[#F5A623]"}`}
        />
        Two-factor authentication
      </h2>

      {status.enabled ? (
        <>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#6E6E80]">
            On since{" "}
            {status.enabledAt
              ? new Date(status.enabledAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })
              : "recently"}
            . {status.recoveryCodesLeft} recovery codes stored.
          </p>
          <button
            onClick={() => void disable()}
            disabled={busy}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Turn it off
          </button>
        </>
      ) : setup ? (
        <>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#6E6E80]">
            Scan this with your authenticator app, then enter the code it shows.
            It is not on until you do — a mistyped scan would otherwise lock you
            out of this console with no way back.
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
              <p className="text-[11.5px] text-[#6E6E80]">
                Or enter this by hand:
              </p>
              <code className="mt-1 block break-all rounded-lg bg-[#0A0A0F] px-3 py-2 font-mono text-[12px] text-white">
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
                className="mt-3 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 font-mono text-[16px] tracking-[0.3em] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
              />

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => void confirm()}
                  disabled={busy || code.length < 6}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6C47FF] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Turn it on
                </button>
                <button
                  onClick={() => {
                    setSetup(null);
                    setCode("");
                  }}
                  className="h-9 rounded-lg px-3 text-[12.5px] text-[#A0A0B0] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1.5 max-w-[60ch] text-[12px] leading-relaxed text-[#6E6E80]">
            This console can issue refunds and sign in as a customer. Everything
            around it — roles, the audit log, the reason required before
            impersonating — assumes you are you, and only a password is checking
            that.
          </p>
          <button
            onClick={() => void begin()}
            disabled={busy}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-[#6C47FF] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Set it up
          </button>
        </>
      )}
    </section>
  );
}
