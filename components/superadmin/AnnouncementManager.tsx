"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { PLANS } from "@/lib/billing/plans";

type Announcement = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
};

const TYPES = [
  { id: "info", label: "Info", colour: "#00D4FF" },
  { id: "success", label: "Success", colour: "#00C851" },
  { id: "warning", label: "Warning", colour: "#FFB020" },
  { id: "critical", label: "Critical", colour: "#FF5A5A" },
];

export function AnnouncementManager() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [endsAt, setEndsAt] = useState("");
  const [targetPlans, setTargetPlans] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/superadmin/announcements", { cache: "no-store" });
    if (response.ok) {
      const { announcements } = (await response.json()) as {
        announcements: Announcement[];
      };
      setItems(announcements);
    }
  }, []);

  useEffect(() => {
    // Deferred so the fetch's setState lands outside the effect body.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function create() {
    setBusy(true);
    setError(null);

    const response = await fetch("/api/superadmin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, type, endsAt: endsAt || null, targetPlans }),
    });

    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not post that.");
      return;
    }

    setTitle("");
    setBody("");
    setEndsAt("");
    setTargetPlans([]);
    await load();
  }

  async function toggle(item: Announcement) {
    await fetch("/api/superadmin/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.is_active }),
    });
    await load();
  }

  return (
    <div className="space-y-8 px-6 py-6 lg:px-8">
      <section className="max-w-[620px] rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-6">
        <h2 className="text-[15px] font-semibold text-white">Post an announcement</h2>
        <p className="mt-1 text-[12.5px] text-[#6E6E80]">
          Shown as a banner on every dashboard page. Critical announcements cannot be
          dismissed.
        </p>

        <div className="mt-4 space-y-3.5">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            className="h-10 w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder="What do people need to know?"
            className="w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 py-2.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {TYPES.map((option) => (
              <button
                key={option.id}
                onClick={() => setType(option.id)}
                className="rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors"
                style={{
                  borderColor: type === option.id ? option.colour : "#1E1E2E",
                  color: type === option.id ? option.colour : "#A0A0B0",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-2 text-[12px] text-[#A0A0B0]">
              Show to — leave all unticked for everyone
            </p>
            <div className="flex flex-wrap gap-2">
              {PLANS.map((plan) => {
                const on = targetPlans.includes(plan.slug);
                return (
                  <button
                    key={plan.slug}
                    onClick={() =>
                      setTargetPlans((current) =>
                        on
                          ? current.filter((p) => p !== plan.slug)
                          : [...current, plan.slug]
                      )
                    }
                    className="rounded-full border px-3 py-1.5 text-[12.5px] transition-colors"
                    style={{
                      borderColor: on ? "#6C47FF" : "#1E1E2E",
                      color: on ? "#FFFFFF" : "#A0A0B0",
                    }}
                  >
                    {plan.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[12.5px] text-[#A0A0B0]">Show until</label>
            <input
              type="date"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="h-10 rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white focus:border-[#6C47FF] focus:outline-none"
            />
            <span className="text-[11.5px] text-[#6E6E80]">blank = permanent</span>
          </div>

          {error && <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>}

          <button
            onClick={create}
            disabled={busy || !title || !body}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#6C47FF] px-5 text-[13px] font-semibold text-white hover:bg-[#7C5AFF] disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Post announcement
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold text-white">Posted</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#6E6E80]">Nothing posted yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((item) => {
              const colour =
                TYPES.find((t) => t.id === item.type)?.colour ?? "#00D4FF";
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4"
                  style={{ borderLeftColor: colour, borderLeftWidth: 3 }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-white">{item.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-[#A0A0B0]">{item.body}</p>
                    <p className="mt-1.5 text-[11px] text-[#6E6E80]">
                      {new Date(item.starts_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                      {item.ends_at
                        ? ` → ${new Date(item.ends_at).toLocaleDateString(undefined, { dateStyle: "medium" })}`
                        : " → no end date"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(item)}
                    className="shrink-0 text-[12px] text-[#A0A0B0] hover:text-white"
                  >
                    {item.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
