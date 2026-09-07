"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const REQUEST_TYPES = [
  { value: "access", label: "See what data is held about me" },
  { value: "erasure", label: "Delete my data" },
  { value: "marketing_objection", label: "Stop marketing messages to me" },
] as const;

export function GdprRequestForm({ initialWebinarId }: { initialWebinarId?: string }) {
  const [webinarId, setWebinarId] = useState(initialWebinarId ?? "");
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState<(typeof REQUEST_TYPES)[number]["value"]>("access");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/gdpr/registrant-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, requesterEmail: email, requestType }),
    });
    const payload = (await response.json()) as { message?: string; error?: string };
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not submit your request.");
      return;
    }
    setResult(payload.message ?? "Request sent.");
  }

  if (result) {
    return (
      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-hairline bg-surface p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00C851]" />
        <p className="text-[13.5px] leading-relaxed text-ink-muted">{result}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-[12.5px] text-ink-muted">
          Webinar link or ID
          <span className="ml-1 text-ink-faint">
            — from the confirmation or reminder email you received
          </span>
        </span>
        <input
          required
          value={webinarId}
          onChange={(event) => setWebinarId(event.target.value)}
          placeholder="The webinar ID from your email"
          className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[13.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <label className="block">
        <span className="text-[12.5px] text-ink-muted">Your email address</span>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[13.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <fieldset>
        <legend className="text-[12.5px] text-ink-muted">What would you like?</legend>
        <div className="mt-2 space-y-1.5">
          {REQUEST_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-muted hover:bg-white/5"
            >
              <input
                type="radio"
                name="requestType"
                value={type.value}
                checked={requestType === type.value}
                onChange={() => setRequestType(type.value)}
                className="h-4 w-4 accent-accent"
              />
              {type.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-[13px] text-[#FF6B6B]">{error}</p>}

      <p className="text-[12px] text-ink-faint">
        Don&rsquo;t have the webinar link? Email{" "}
        <a href="mailto:support@loopinglive.com" className="text-accent hover:text-accent-soft">
          support@loopinglive.com
        </a>{" "}
        instead and we&rsquo;ll help you find the right host.
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
      >
        {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Send request
      </button>
    </form>
  );
}
