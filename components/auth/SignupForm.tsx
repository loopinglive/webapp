"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const REF_COOKIE = "loopinglive_ref";

function cookieValue(name: string) {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] ?? ""
  );
}

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // A referral can arrive on the URL or from the cookie set when someone
  // landed on the marketing site through an affiliate link days earlier.
  useEffect(() => {
    const fromUrl = params.get("ref");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReferralCode(fromUrl || cookieValue(REF_COOKIE));
  }, [params]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms and Privacy Policy to continue.");
      return;
    }

    setPending(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, referralCode }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setPending(false);
      setError(payload.error ?? "Could not create your account.");
      return;
    }

    // The API creates the account; sign in here so the session cookie is set
    // on this browser rather than relying on the API's own client.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);

    if (signInError) {
      // Almost always "confirm your email" — a success, not a failure.
      router.push("/login?created=1");
      return;
    }

    router.push("/dashboard?welcome=1");
    router.refresh();
  }

  return (
    <GlassPanel strong className="p-8">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        Create your account
      </h1>
      <p className="mt-1.5 text-[13.5px] text-ink-muted">
        Free forever. Build your entire webinar before you pay a thing.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-3.5">
        <Input
          required
          autoComplete="name"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
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
          autoComplete="new-password"
          placeholder="Password (8 characters or more)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {referralCode && (
          <p className="rounded-xl bg-accent/10 px-3.5 py-2.5 text-[12.5px] text-accent-soft">
            Referral code applied: <strong>{referralCode}</strong>
          </p>
        )}

        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[12.5px] text-ink-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#6C47FF]"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-accent-soft hover:text-cyan">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-accent-soft hover:text-cyan">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {error && (
          <p className="rounded-xl bg-live/10 px-3.5 py-2.5 text-[12.5px] text-live">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Creating your account…" : "Create free account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-faint">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-soft transition-colors hover:text-cyan">
          Log in
        </Link>
      </p>
    </GlassPanel>
  );
}
