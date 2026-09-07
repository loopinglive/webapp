"use client";

import { useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";

import type { PlanSlug } from "@/lib/billing/plans";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
};

export function RazorpayCheckout({ planSlug, label }: { planSlug: PlanSlug; label: string }) {
  const [scriptReady, setScriptReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!scriptReady || typeof window.Razorpay === "undefined") {
      setError("Payment is still loading — try again in a moment.");
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch("/api/payments/local/razorpay/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planSlug }),
    });
    const order = (await response.json()) as {
      orderId?: string;
      amountPaise?: number;
      currency?: string;
      keyId?: string;
      name?: string;
      email?: string;
      error?: string;
    };

    if (!response.ok || !order.orderId) {
      setError(order.error ?? "Could not start checkout.");
      setPending(false);
      return;
    }

    const razorpay = new window.Razorpay({
      key: order.keyId!,
      amount: order.amountPaise!,
      currency: order.currency!,
      name: "Loopinglive",
      description: `${label} plan`,
      order_id: order.orderId,
      prefill: { name: order.name ?? "", email: order.email ?? "" },
      theme: { color: "#6C47FF" },
      handler: async (result) => {
        const verify = await fetch("/api/payments/local/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });
        if (verify.ok) {
          window.location.href = "/dashboard?upgraded=true";
        } else {
          setError("Payment could not be verified. Contact support if you were charged.");
          setPending(false);
        }
      },
      modal: { ondismiss: () => setPending(false) },
    });

    razorpay.open();
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptReady(true)} />
      <button
        onClick={start}
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-surface px-4 text-[13px] font-medium text-ink transition-colors hover:border-accent/40 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Pay with Razorpay — {label}
      </button>
      {error && <p className="mt-1.5 text-[12px] text-[#FF6B6B]">{error}</p>}
    </div>
  );
}
