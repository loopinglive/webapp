"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

/** Persistent reminder that the dashboard being viewed is not the admin's own. */
export function ImpersonationBanner({ name }: { name: string }) {
  const [leaving, setLeaving] = useState(false);

  async function exit() {
    setLeaving(true);
    await fetch("/api/superadmin/impersonate", { method: "DELETE" });
    // Full reload on purpose: the impersonation cookie is read by the server
    // layout, and a client-side transition would not re-run it.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/superadmin/users";
  }

  return (
    <div className="flex items-center gap-3 bg-[#FF5A5A] px-6 py-2.5 lg:px-10">
      <AlertTriangle className="h-4 w-4 shrink-0 text-white" />
      <p className="flex-1 text-[13px] font-medium text-white">
        You are viewing as {name}. Everything you do is recorded against your admin
        account.
      </p>
      <button
        onClick={exit}
        disabled={leaving}
        className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-white/20 px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/30 disabled:opacity-60"
      >
        {leaving && <Loader2 className="h-3 w-3 animate-spin" />}
        Exit impersonation
      </button>
    </div>
  );
}
