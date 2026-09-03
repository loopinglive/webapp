"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);

    // Our endpoint, not supabase.auth.resetPasswordForEmail: that sends
    // Supabase's own template from Supabase's domain.
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});

    setPending(false);
    // Always reports success. Telling someone an address is not registered
    // turns this form into a way to enumerate our customers.
    setSent(true);
  }

  if (sent) {
    return (
      <GlassPanel strong className="p-8 text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Check your email</h1>
        <p className="mx-auto mt-2 max-w-[36ch] text-[13.5px] text-ink-muted">
          If an account exists for {email}, a reset link is on its way. It expires in
          an hour.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-[13px] text-accent-soft transition-colors hover:text-cyan"
        >
          Back to log in
        </Link>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel strong className="p-8">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        Reset your password
      </h1>
      <p className="mt-1.5 text-[13.5px] text-ink-muted">
        We will email you a link to choose a new one.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-3.5">
        <Input
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-faint">
        Remembered it?{" "}
        <Link href="/login" className="text-accent-soft transition-colors hover:text-cyan">
          Log in
        </Link>
      </p>
    </GlassPanel>
  );
}
