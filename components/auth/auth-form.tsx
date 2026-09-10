"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    router.push(params.get("next") ?? "/dashboard");
    router.refresh();
  }

  return (
    <GlassPanel strong className="p-8">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-[13.5px] text-ink-muted">
        {isSignup
          ? "Free to start. Unlock everything when you are ready."
          : "Pick up where your last session left off."}
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
        <Input
          type="password"
          required
          minLength={8}
          autoComplete={isSignup ? "new-password" : "current-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="rounded-xl bg-live/10 px-3.5 py-2.5 text-[12.5px] text-live">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "One moment…" : isSignup ? "Create account" : "Log in"}
        </Button>
      </form>

      {/* Password recovery was fully built — /forgot-password, /reset-password,
          the forms and a rate-limited API route — and then nothing linked to
          it, so anyone who forgot their password had no way back into their
          own account. This is that link. */}
      {!isSignup && (
        <p className="mt-4 text-center text-[13px]">
          <Link
            href="/forgot-password"
            className="text-ink-muted transition-colors hover:text-ink"
          >
            Forgot your password?
          </Link>
        </p>
      )}

      <p className="mt-6 text-center text-[13px] text-ink-faint">
        {isSignup ? "Already have an account? " : "New to Loopinglive? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="text-accent-soft transition-colors hover:text-cyan"
        >
          {isSignup ? "Log in" : "Create one"}
        </Link>
      </p>
    </GlassPanel>
  );
}
