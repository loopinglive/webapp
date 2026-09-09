"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * What the console shows when it knows who you are but has not checked it is
 * still you.
 *
 * Rendered instead of the console rather than over it: a modal on top of a
 * loaded page means the page underneath already rendered, and everything on it
 * already ran its queries.
 */
export function SecondFactorGate({
  challengeUrl = "/api/superadmin/2fa/challenge",
}: {
  challengeUrl?: string;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (code.trim().length < 6) return;
    setBusy(true);
    setError(null);

    const response = await fetch(challengeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const payload = (await response.json()) as {
      error?: string;
      usedRecoveryCode?: boolean;
      recoveryCodesLeft?: number;
    };

    if (!response.ok) {
      setBusy(false);
      setError(payload.error ?? "That code is not right.");
      setCode("");
      return;
    }

    if (payload.usedRecoveryCode) {
      window.alert(
        `Recovery code accepted and now spent. ${payload.recoveryCodesLeft} left.\n\n` +
          "Set up your authenticator again when you can — recovery codes are " +
          "meant to run out."
      );
    }

    // A full reload rather than a router refresh: the layout decides whether
    // the console renders at all, and it has to re-run with the new cookie.
    window.location.reload();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-void px-6">
      <div className="w-full max-w-sm">
        <ShieldCheck className="h-6 w-6 text-accent" />
        <h1 className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-ink">
          Enter your code
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          From your authenticator app. A recovery code works too, and using one
          spends it.
        </p>

        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          aria-label="Authentication code"
          className="mt-4 h-12 w-full rounded-xl border border-hairline bg-surface px-4 font-mono text-[18px] tracking-[0.3em] text-ink placeholder:text-surface-3 focus:border-accent focus:outline-none"
        />

        {error && <p className="mt-2 text-[12.5px] text-[#FF5A5A]">{error}</p>}

        <button
          onClick={() => void submit()}
          disabled={busy || code.trim().length < 6}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-medium text-white hover:bg-accent-deep disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </button>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-faint">
          Asked once every twelve hours per browser. Long enough not to be in
          the way through a working day, short enough that a laptop left open
          overnight is not still signed in tomorrow.
        </p>
      </div>
    </main>
  );
}
