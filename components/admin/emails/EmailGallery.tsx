"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Mail, Send } from "lucide-react";

import { cn } from "@/lib/utils";

type Row = {
  key: string;
  label: string;
  audience: "host" | "attendee";
  category: string;
  transactional: boolean;
  hasCta: boolean;
};

type Preview = {
  subject: string;
  html: string;
  text: string;
  unresolved: string[];
};

const CATEGORY_LABELS: Record<string, string> = {
  account: "Account & security",
  activation: "Activation",
  operations: "Operations",
  billing: "Billing",
  compliance: "Compliance",
  team: "Team",
  attendee: "Attendee",
};

export function EmailGallery() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<"all" | "host" | "attendee">("all");

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/admin/emails", { cache: "no-store" });
      if (!response.ok) return;
      const { templates } = (await response.json()) as { templates: Row[] };
      setRows(templates);
      setSelected(templates[0]?.key ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    (async () => {
      setLoadingPreview(true);
      try {
        const response = await fetch(`/api/admin/emails?key=${selected}`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        setPreview((await response.json()) as Preview);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const sendTest = useCallback(async () => {
    if (!selected) return;
    setSending(true);
    setError(null);
    setSent(null);

    const response = await fetch("/api/admin/emails/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: selected }),
    });

    const payload = (await response.json()) as { sentTo?: string; error?: string };
    setSending(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not send the test.");
      return;
    }
    setSent(payload.sentTo ?? "your inbox");
    setTimeout(() => setSent(null), 4000);
  }, [selected]);

  const grouped = useMemo(() => {
    const visible = rows.filter(
      (row) => audience === "all" || row.audience === audience
    );
    const map = new Map<string, Row[]>();
    for (const row of visible) {
      const bucket = `${row.audience}:${row.category}`;
      map.set(bucket, [...(map.get(bucket) ?? []), row]);
    }
    return [...map.entries()];
  }, [rows, audience]);

  const current = rows.find((row) => row.key === selected);

  return (
    <div className="flex min-h-dvh bg-[#0A0A0F]">
      {/* List */}
      <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-[#1E1E2E] bg-[#0D0D17]">
        <div className="sticky top-0 z-10 border-b border-[#1E1E2E] bg-[#0D0D17] px-4 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#6C47FF]" />
            <h1 className="text-[14px] font-semibold text-white">Platform email</h1>
            <span className="ml-auto text-[11px] tabular-nums text-[#6E6E80]">
              {rows.length}
            </span>
          </div>

          <div className="mt-3 flex gap-1 rounded-full border border-[#1E1E2E] bg-[#12121A] p-1">
            {(["all", "host", "attendee"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setAudience(option)}
                className={cn(
                  "flex-1 rounded-full px-2 py-1 text-[11.5px] capitalize transition-colors",
                  audience === option
                    ? "bg-[#6C47FF] text-white"
                    : "text-[#A0A0B0] hover:text-white"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {grouped.map(([bucket, items]) => {
          const [aud, category] = bucket.split(":");
          return (
            <div key={bucket} className="px-2 py-3">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
                {aud} · {CATEGORY_LABELS[category] ?? category}
              </p>
              {items.map((row) => (
                <button
                  key={row.key}
                  onClick={() => setSelected(row.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors",
                    selected === row.key
                      ? "bg-[#6C47FF]/15 text-white"
                      : "text-[#A0A0B0] hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="flex-1 truncate">{row.label}</span>
                  {!row.transactional && (
                    <span
                      title="Lifecycle email — carries an unsubscribe link"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00D4FF]"
                    />
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </aside>

      {/* Preview */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#1E1E2E] px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-white">
              {preview?.subject ?? current?.label ?? "—"}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#6E6E80]">
              <code className="text-[#00D4FF]">{selected}</code>
              {current && (
                <>
                  {" · "}
                  {current.transactional ? "transactional" : "lifecycle"}
                  {current.transactional
                    ? " · no unsubscribe link"
                    : " · carries unsubscribe"}
                </>
              )}
            </p>
          </div>

          <button
            onClick={sendTest}
            disabled={sending || !selected}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#7C5AFF] disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : sent ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {sent ? `Sent to ${sent}` : "Send test to me"}
          </button>
        </header>

        {error && (
          <p className="border-b border-[#1E1E2E] bg-[#FF3B3B]/10 px-6 py-2.5 text-[12.5px] text-[#FF6B6B]">
            {error}
          </p>
        )}

        {preview && preview.unresolved.length > 0 && (
          <p className="flex items-center gap-2 border-b border-[#1E1E2E] bg-[#FFB020]/10 px-6 py-2.5 text-[12.5px] text-[#FFB020]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Unresolved merge fields: {preview.unresolved.join(", ")}
          </p>
        )}

        <div className="flex-1 overflow-auto p-6">
          {loadingPreview && !preview ? (
            <div className="grid h-full place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
            </div>
          ) : (
            <iframe
              // Sandboxed with no allow-scripts: the preview renders, but
              // nothing in it can execute against the admin origin.
              sandbox=""
              title="Email preview"
              srcDoc={preview?.html ?? ""}
              className="mx-auto h-full min-h-[720px] w-full max-w-[680px] rounded-xl border border-[#1E1E2E] bg-white"
            />
          )}
        </div>
      </section>
    </div>
  );
}
