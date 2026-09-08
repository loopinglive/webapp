"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

/** Claims a co-host invitation. The dashboard layout has already required a signed-in account by the time this renders. */
export function CoHostAccept({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"working" | "done" | "failed">("working");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch("/api/co-hosts/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          if (!response.ok) {
            setError(payload.error ?? "That invitation could not be accepted.");
            setState("failed");
            return;
          }
          setState("done");
        })
        .catch(() => {
          setError("Something went wrong accepting that invitation.");
          setState("failed");
        });
    }, 0);
    return () => clearTimeout(timer);
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      {state === "working" && (
        <>
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-ink-faint" />
          <p className="mt-4 text-[13px] text-ink-muted">Accepting your invitation…</p>
        </>
      )}

      {state === "done" && (
        <>
          <CheckCircle2 className="mx-auto h-7 w-7 text-accent-soft" />
          <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-ink">You&rsquo;re a co-host</h1>
          <p className="mt-2 text-[13px] text-ink-muted">
            This webinar now appears under Co-hosting in your dashboard, with the permissions the host gave you.
          </p>
          <button
            onClick={() => router.push("/co-hosting")}
            className="mt-6 inline-flex h-10 items-center rounded-full bg-accent px-5 text-[13px] font-semibold text-white hover:bg-accent-soft"
          >
            Go to co-hosting
          </button>
        </>
      )}

      {state === "failed" && (
        <>
          <TriangleAlert className="mx-auto h-7 w-7 text-[#FF6B6B]" />
          <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-ink">That didn&rsquo;t work</h1>
          <p className="mt-2 text-[13px] text-ink-muted">{error}</p>
        </>
      )}
    </div>
  );
}
