"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }

    setPending(true);

    // Supabase puts the recovery session in place from the link's fragment
    // before this runs, so updateUser applies to the right account.
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setPending(false);

    if (updateError) {
      setError(
        updateError.message.includes("session")
          ? "This reset link has expired. Request a new one."
          : updateError.message
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <GlassPanel strong className="p-8">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        Choose a new password
      </h1>
      <p className="mt-1.5 text-[13.5px] text-ink-muted">
        Eight characters or more.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-3.5">
        <Input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {error && (
          <p className="rounded-xl bg-live/10 px-3.5 py-2.5 text-[12.5px] text-live">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </GlassPanel>
  );
}
