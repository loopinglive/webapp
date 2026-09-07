"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";

import type { PlanSlug } from "@/lib/billing/plans";

type Stage = "idle" | "sending" | "waiting" | "success" | "failed";

export function MpesaCheckout({ planSlug, label }: { planSlug: PlanSlug; label: string }) {
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  async function start() {
    setError(null);
    setStage("sending");

    const response = await fetch("/api/payments/local/mpesa/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planSlug, phoneNumber: phone }),
    });
    const payload = (await response.json()) as { checkoutRequestId?: string; error?: string };

    if (!response.ok || !payload.checkoutRequestId) {
      setError(payload.error ?? "Could not send that prompt.");
      setStage("idle");
      return;
    }

    setStage("waiting");
    const checkoutRequestId = payload.checkoutRequestId;

    pollRef.current = setInterval(async () => {
      const statusResponse = await fetch(`/api/payments/local/mpesa/status?checkoutRequestId=${checkoutRequestId}`);
      if (!statusResponse.ok) return;
      const statusPayload = (await statusResponse.json()) as { status?: string };

      if (statusPayload.status === "completed") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStage("success");
        window.location.href = "/dashboard?upgraded=true";
      } else if (statusPayload.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStage("failed");
      }
    }, 3000);
  }

  if (stage === "waiting") {
    return (
      <div className="rounded-lg border border-hairline bg-surface px-4 py-5 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />
        <p className="mt-2 text-[13px] text-ink">Check your phone</p>
        <p className="mt-1 text-[12px] text-ink-faint">Enter your M-Pesa PIN to complete the payment.</p>
      </div>
    );
  }

  if (stage === "failed") {
    return (
      <div className="rounded-lg border border-[#FF5A5A]/30 bg-[#FF5A5A]/5 px-4 py-3 text-center">
        <p className="text-[12.5px] text-[#FF6B6B]">The prompt was not completed. Try again.</p>
        <button onClick={() => setStage("idle")} className="mt-2 text-[12.5px] text-accent-soft hover:text-accent">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="block">
        <span className="sr-only">M-Pesa phone number</span>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="2547XXXXXXXX"
          className="h-10 w-full rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>
      <button
        onClick={start}
        disabled={stage === "sending" || !phone}
        className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-surface px-4 text-[13px] font-medium text-ink transition-colors hover:border-accent/40 disabled:opacity-50"
      >
        {stage === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
        Pay with M-Pesa — {label}
      </button>
      {error && <p className="mt-1.5 text-[12px] text-[#FF6B6B]">{error}</p>}
    </div>
  );
}
