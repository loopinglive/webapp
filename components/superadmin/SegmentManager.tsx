"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, Users } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { PLANS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type Filters = {
  plan?: string[];
  hasWebinar?: boolean;
  hasPublished?: boolean;
  hasPaid?: boolean;
  signedUpWithinDays?: number;
  inactiveForDays?: number;
};

type Segment = {
  id: string;
  name: string;
  description: string | null;
  filters: Filters;
  count: number;
};

type Broadcast = {
  id: string;
  subject: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
};

/** The lists worth having ready. Each is one filter away from being useful. */
const PRESETS: { name: string; description: string; filters: Filters }[] = [
  {
    name: "Ready to upgrade",
    description: "Free, published a webinar, never paid. The best upsell list there is.",
    filters: { plan: ["free"], hasPublished: true, hasPaid: false },
  },
  {
    name: "Stalled at setup",
    description: "Created a webinar but never published it.",
    filters: { hasWebinar: true, hasPublished: false },
  },
  {
    name: "Never started",
    description: "Signed up and never created anything.",
    filters: { hasWebinar: false },
  },
  {
    name: "Gone quiet",
    description: "Paying, but not seen in 30 days.",
    filters: { hasPaid: true, inactiveForDays: 30 },
  },
];

export function SegmentManager() {
  const toast = useToast();
  const [data, setData] = useState<{
    segments: Segment[];
    broadcasts: Broadcast[];
  } | null>(null);

  const [filters, setFilters] = useState<Filters>({});
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(
    null
  );
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/superadmin/segments", { cache: "no-store" });
    if (response.ok) setData(await response.json());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Live count for whatever is currently selected, so nobody sends blind.
  // Derived rather than cleared in the effect: an empty filter set has no
  // audience by definition, and clearing state in an effect to say so is a
  // cascading render for a value we already know.
  const hasFilters = Object.keys(filters).length > 0;
  const visiblePreview = hasFilters ? preview : null;

  useEffect(() => {
    if (!hasFilters) return;

    const timer = setTimeout(async () => {
      const response = await fetch(
        `/api/superadmin/segments?preview=${encodeURIComponent(JSON.stringify(filters))}`,
        { cache: "no-store" }
      );
      if (response.ok) setPreview(await response.json());
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, hasFilters]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => {
      const next = { ...current };
      if (value === undefined || value === null) delete next[key];
      else next[key] = value;
      return next;
    });

  async function save() {
    setBusy("save");
    const response = await fetch("/api/superadmin/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, filters }),
    });
    setBusy(null);

    if (!response.ok) {
      toast.error("Could not save that segment.");
      return;
    }
    setName("");
    await load();
    toast.success("Segment saved.");
  }

  async function send() {
    if (!visiblePreview?.count) return;

    const confirmed = window.confirm(
      `Send "${subject}" to ${visiblePreview.count} ${visiblePreview.count === 1 ? "person" : "people"}? This cannot be undone.`
    );
    if (!confirmed) return;

    setBusy("send");
    const response = await fetch("/api/superadmin/segments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters, subject, body, confirm: true }),
    });

    const payload = (await response.json()) as {
      sent?: number;
      failed?: number;
      error?: string;
    };
    setBusy(null);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not send.");
      return;
    }

    toast.success(
      payload.failed
        ? `Sent to ${payload.sent}, ${payload.failed} failed.`
        : `Sent to ${payload.sent}.`
    );
    setSubject("");
    setBody("");
    await load();
  }

  if (!data) {
    return (
      <div className="px-6 py-6 lg:px-8">
        <SkeletonRows rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-6 py-6 lg:px-8">
      {/* Build */}
      <section className="max-w-[680px] rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <h2 className="text-[15px] font-semibold text-white">Build a segment</h2>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setFilters(preset.filters);
                setName(preset.name);
              }}
              title={preset.description}
              className="rounded-full border border-[#1E1E2E] px-3 py-1.5 text-[12px] text-[#A0A0B0] transition-colors hover:border-[#6C47FF]/50 hover:text-white"
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3.5">
          <div>
            <p className="mb-1.5 text-[12px] text-[#A0A0B0]">On plan</p>
            <div className="flex flex-wrap gap-1.5">
              {PLANS.map((plan) => {
                const on = filters.plan?.includes(plan.slug) ?? false;
                return (
                  <button
                    key={plan.slug}
                    onClick={() => {
                      const current = filters.plan ?? [];
                      const next = on
                        ? current.filter((p) => p !== plan.slug)
                        : [...current, plan.slug];
                      set("plan", next.length ? next : undefined);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12px] transition-colors",
                      on
                        ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                        : "border-[#1E1E2E] text-[#6E6E80] hover:text-white"
                    )}
                  >
                    {plan.name}
                  </button>
                );
              })}
            </div>
          </div>

          {[
            { key: "hasWebinar" as const, label: "Has created a webinar" },
            { key: "hasPublished" as const, label: "Has published one" },
            { key: "hasPaid" as const, label: "Has ever paid" },
          ].map((row) => (
            <Tri
              key={row.key}
              label={row.label}
              value={filters[row.key]}
              onChange={(value) => set(row.key, value)}
            />
          ))}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[12px] text-[#A0A0B0]">Signed up within (days)</span>
              <input
                inputMode="numeric"
                value={filters.signedUpWithinDays ?? ""}
                onChange={(e) =>
                  set(
                    "signedUpWithinDays",
                    e.target.value ? Number(e.target.value.replace(/\D/g, "")) : undefined
                  )
                }
                placeholder="any"
                className="mt-1.5 h-9 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white placeholder:text-[#4A4A5C] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="flex items-center gap-1.5 text-[12px] text-[#A0A0B0]">
                Not seen in (days)
                <HelpTooltip content="Matches accounts whose last sign-in is older than this, and accounts that have never signed in." />
              </span>
              <input
                inputMode="numeric"
                value={filters.inactiveForDays ?? ""}
                onChange={(e) =>
                  set(
                    "inactiveForDays",
                    e.target.value ? Number(e.target.value.replace(/\D/g, "")) : undefined
                  )
                }
                placeholder="any"
                className="mt-1.5 h-9 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white placeholder:text-[#4A4A5C] focus:outline-none"
              />
            </label>
          </div>
        </div>

        {visiblePreview && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-4 py-3">
            <Users className="h-4 w-4 text-[#00D4FF]" />
            <span className="text-[14px] font-semibold tabular-nums text-white">
              {visiblePreview.count.toLocaleString()}
            </span>
            <span className="text-[12.5px] text-[#A0A0B0]">
              {visiblePreview.count === 1 ? "account matches" : "accounts match"}
            </span>
            {visiblePreview.sample.length > 0 && (
              <span className="ml-auto truncate text-[11.5px] text-[#6E6E80]">
                {visiblePreview.sample.slice(0, 2).join(", ")}
                {visiblePreview.count > 2 && ` +${visiblePreview.count - 2} more`}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this segment"
            className="h-9 flex-1 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white placeholder:text-[#4A4A5C] focus:outline-none"
          />
          <button
            onClick={save}
            disabled={busy !== null || !name.trim() || !visiblePreview}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[#2A2A3A] px-4 text-[12.5px] text-white hover:border-[#6C47FF]/50 disabled:opacity-40"
          >
            {busy === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save segment
          </button>
        </div>
      </section>

      {/* Send */}
      <section className="max-w-[680px] rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <h2 className="text-[15px] font-semibold text-white">Email this segment</h2>
        <p className="mt-0.5 text-[12px] text-[#6E6E80]">
          Uses the platform email design. <code className="text-[#00D4FF]">{"{{name}}"}</code>{" "}
          becomes their first name.
        </p>

        <div className="mt-4 space-y-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="h-10 w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder={"Hi {{name}},\n\nBlank lines separate paragraphs. Lines starting with - become bullets."}
            className="w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 py-2.5 text-[13px] leading-relaxed text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
          />

          <button
            onClick={send}
            disabled={busy !== null || !subject.trim() || !body.trim() || !visiblePreview?.count}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#6C47FF] px-5 text-[13px] font-semibold text-white hover:bg-[#7C5AFF] disabled:opacity-40"
          >
            {busy === "send" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {visiblePreview?.count
              ? `Send to ${visiblePreview.count.toLocaleString()}`
              : "Choose a segment first"}
          </button>
        </div>
      </section>

      {/* Saved */}
      <section>
        <h2 className="text-[15px] font-semibold text-white">Saved segments</h2>
        {data.segments.length === 0 ? (
          <EmptyState
            className="mt-3"
            icon="🎯"
            title="No saved segments"
            description="Build one above and save it. Counts stay live, so a segment saved today still tells you the truth next month."
          />
        ) : (
          <ul className="mt-3 space-y-2">
            {data.segments.map((segment) => (
              <li
                key={segment.id}
                className="flex items-center gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white">{segment.name}</p>
                  {segment.description && (
                    <p className="text-[11.5px] text-[#6E6E80]">{segment.description}</p>
                  )}
                </div>
                <span className="text-[13px] tabular-nums text-[#00D4FF]">
                  {segment.count.toLocaleString()}
                </span>
                <button
                  onClick={() => setFilters(segment.filters)}
                  className="text-[12px] text-[#A0A0B0] hover:text-white"
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* History */}
      {data.broadcasts.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-white">Recent broadcasts</h2>
          <ul className="mt-3 space-y-1.5">
            {data.broadcasts.map((broadcast) => (
              <li
                key={broadcast.id}
                className="flex items-center gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-2.5 text-[12.5px]"
              >
                <span className="min-w-0 flex-1 truncate text-white">
                  {broadcast.subject}
                </span>
                <span className="tabular-nums text-[#00C851]">{broadcast.sent_count} sent</span>
                {broadcast.failed_count > 0 && (
                  <span className="tabular-nums text-[#FF6B6B]">
                    {broadcast.failed_count} failed
                  </span>
                )}
                <span className="text-[11px] text-[#6E6E80]">
                  {broadcast.sent_at
                    ? new Date(broadcast.sent_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : broadcast.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Yes / no / either — because "not set" is a different filter from "false". */
function Tri({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}) {
  const options: { label: string; value: boolean | undefined }[] = [
    { label: "Either", value: undefined },
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];

  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-[12.5px] text-[#A0A0B0]">{label}</span>
      <div className="flex gap-1 rounded-full border border-[#1E1E2E] bg-[#0D0D15] p-0.5">
        {options.map((option) => (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11.5px] transition-colors",
              value === option.value
                ? "bg-[#6C47FF] text-white"
                : "text-[#6E6E80] hover:text-white"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
