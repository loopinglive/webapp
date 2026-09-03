"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Check,
  KeyRound,
  Loader2,
  Mail,
  Save,
  UserCog,
} from "lucide-react";

import { PLANS, type PlanSlug } from "@/lib/billing/plans";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows, SkeletonTiles } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

type Detail = {
  account: {
    id: string;
    full_name: string;
    email: string;
    plan_slug: string;
    subscription_status: string | null;
    is_admin: boolean;
    is_suspended: boolean;
    suspended_reason: string | null;
    admin_note: string | null;
    referral_code: string;
    created_at: string;
    last_login_at: string | null;
    stripe_customer_id: string | null;
  };
  webinars: { id: string; title: string; status: string; created_at: string; video_url: string | null }[];
  invoices: { id: string; amount: number; currency: string; status: string; plan_slug: string; paid_at: string | null; created_at: string }[];
  messages: {
    id: string;
    channel: string;
    status: string;
    template_key: string | null;
    subject: string | null;
    error_message: string | null;
    scheduled_for: string;
    sent_at: string | null;
    recipient_email: string | null;
  }[];
  registrantCount: number;
  flags: { id: string; flag_name: string; is_enabled: boolean }[];
  apiKeys: { id: string; name: string; key_prefix: string; last_used_at: string | null; is_active: boolean }[];
  webhookEndpoints: { id: string; url: string; is_active: boolean }[];
  integrations: { provider: string; status: string; last_error: string | null; last_synced_at: string | null }[];
  affiliate: { referral_code: string; total_referrals: number; total_earnings: number; pending_earnings: number; paid_earnings: number } | null;
  adminActions: { action: string; detail: unknown; created_at: string }[];
  impersonations: { reason: string | null; started_at: string; ended_at: string | null }[];
  errors: { error_type: string; error_message: string; page_url: string | null; created_at: string }[];
  timeline: { at: string; label: string; kind: string }[];
};

const STATUS_COLOUR: Record<string, string> = {
  sent: "#00C851",
  delivered: "#00C851",
  pending: "#00D4FF",
  failed: "#FF5A5A",
  cancelled: "#6E6E80",
  skipped: "#6E6E80",
  paid: "#00C851",
  complimentary: "#6C47FF",
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amount);

const when = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

export function UserDetail({ userId }: { userId: string }) {
  const toast = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/superadmin/users/${userId}`, {
      cache: "no-store",
    });
    if (response.status === 404) {
      setNotFound(true);
      return;
    }
    if (!response.ok) return;

    const payload = (await response.json()) as Detail;
    setData(payload);
    setNote(payload.account.admin_note ?? "");
    setEmail(payload.account.email);
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const patch = useCallback(
    async (body: Record<string, unknown>, label: string) => {
      setBusy(label);
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      setBusy(null);

      if (!response.ok) {
        toast.error(payload.error ?? "That did not work.");
        return false;
      }
      toast.success("Done.");
      await load();
      return true;
    },
    [userId, load, toast]
  );

  if (notFound) {
    return (
      <div className="px-6 py-10 lg:px-8">
        <EmptyState
          icon="🔍"
          title="No such user"
          description="This account may have been deleted, or the link is wrong."
          action={
            <Link href="/superadmin/users" className="text-[13px] text-[#6C47FF]">
              Back to users
            </Link>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5 px-6 py-6 lg:px-8">
        <SkeletonTiles count={4} />
        <SkeletonRows rows={6} columns={4} />
      </div>
    );
  }

  const a = data.account;
  const revenue = data.invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const failedMessages = data.messages.filter((m) => m.status === "failed").length;

  return (
    <div className="space-y-6 px-6 py-6 lg:px-8">
      <Link
        href="/superadmin/users"
        className="inline-flex items-center gap-2 text-[13px] text-[#A0A0B0] hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All users
      </Link>

      {/* Identity */}
      <header className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
              {a.full_name || a.email}
              {a.is_admin && (
                <span className="ml-2 rounded-full bg-[#FF5A5A]/15 px-2 py-0.5 text-[10px] align-middle text-[#FF5A5A]">
                  admin
                </span>
              )}
              {a.is_suspended && (
                <span className="ml-2 rounded-full bg-[#FF5A5A]/15 px-2 py-0.5 text-[10px] align-middle text-[#FF5A5A]">
                  suspended
                </span>
              )}
            </h1>
            <p className="mt-1 text-[13px] text-[#A0A0B0]">{a.email}</p>
            <p className="mt-1 text-[11.5px] text-[#6E6E80]">
              Joined {when(a.created_at)} · last seen {when(a.last_login_at)} · code{" "}
              <code className="text-[#00D4FF]">{a.referral_code}</code>
            </p>
            {a.is_suspended && a.suspended_reason && (
              <p className="mt-2 rounded-lg bg-[#FF5A5A]/10 px-3 py-2 text-[12px] text-[#FF6B6B]">
                Suspended: {a.suspended_reason}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              defaultValue=""
              disabled={busy !== null}
              onChange={async (event) => {
                const plan = event.target.value as PlanSlug;
                event.target.value = "";
                if (!plan) return;
                setBusy("plan");
                const response = await fetch("/api/superadmin/grant-plan", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, planSlug: plan }),
                });
                setBusy(null);
                if (response.ok) {
                  toast.success(`Granted ${plan}.`);
                  await load();
                } else {
                  toast.error("Could not grant that plan.");
                }
              }}
              className="h-9 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12.5px] text-white focus:outline-none"
            >
              <option value="">Grant plan…</option>
              {PLANS.map((plan) => (
                <option key={plan.slug} value={plan.slug}>
                  {plan.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => patch({ sendPasswordReset: true }, "reset")}
              disabled={busy !== null}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] hover:text-white disabled:opacity-50"
            >
              {busy === "reset" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <KeyRound className="h-3.5 w-3.5" />
              )}
              Send reset
            </button>

            {!a.is_admin && (
              <button
                onClick={async () => {
                  if (a.is_suspended) {
                    await patch({ suspend: false }, "suspend");
                    return;
                  }
                  // A reason is required so the audit log is worth reading.
                  const reason = window.prompt("Reason for suspension (recorded):");
                  if (!reason?.trim()) return;
                  await patch({ suspend: true, suspendReason: reason }, "suspend");
                }}
                disabled={busy !== null}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A] disabled:opacity-50"
              >
                {busy === "suspend" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : a.is_suspended ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
                {a.is_suspended ? "Unsuspend" : "Suspend"}
              </button>
            )}

            {!a.is_admin && (
              <button
                onClick={async () => {
                  const reason = window.prompt("Reason for impersonating (recorded):");
                  if (!reason?.trim()) return;
                  const response = await fetch("/api/superadmin/impersonate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, reason }),
                  });
                  if (!response.ok) {
                    toast.error("Could not start impersonation.");
                    return;
                  }
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  window.location.assign("/dashboard");
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] hover:border-[#6C47FF]/50 hover:text-white"
              >
                <UserCog className="h-3.5 w-3.5" />
                Impersonate
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Plan" value={a.plan_slug} sub={a.subscription_status ?? "active"} />
        <Stat label="Webinars" value={String(data.webinars.length)} />
        <Stat label="Registrants" value={data.registrantCount.toLocaleString()} />
        <Stat label="Paid us" value={money(revenue, data.invoices[0]?.currency ?? "usd")} />
      </div>

      {/* Support note + email correction */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Admin note" note="Private. Context that outlives a conversation.">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Anything the next person handling this account should know."
            className="w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 py-2.5 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
          />
          <button
            onClick={() => patch({ adminNote: note }, "note")}
            disabled={busy !== null || note === (a.admin_note ?? "")}
            className="mt-2 inline-flex h-9 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[12.5px] font-medium text-white hover:bg-[#7C5AFF] disabled:opacity-40"
          >
            {busy === "note" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save note
          </button>
        </Panel>

        <Panel
          title="Email address"
          note="Changes it in both auth and the account record. People mistype it at signup and cannot then receive the confirmation."
        >
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white focus:border-[#6C47FF] focus:outline-none"
          />
          <button
            onClick={() => patch({ email }, "email")}
            disabled={busy !== null || email === a.email || !email.includes("@")}
            className="mt-2 inline-flex h-9 items-center gap-2 rounded-full border border-[#2A2A3A] px-4 text-[12.5px] text-white hover:border-[#6C47FF]/50 disabled:opacity-40"
          >
            {busy === "email" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Change email
          </button>
        </Panel>
      </div>

      {/* Message log — the "why didn't my reminders send" screen */}
      <Panel
        title="Message delivery"
        note={
          failedMessages > 0
            ? `${failedMessages} of the last ${data.messages.length} failed. The provider's own error is shown.`
            : "Every email, SMS and WhatsApp queued for this account's webinars."
        }
      >
        {data.messages.length === 0 ? (
          <p className="text-[13px] text-[#6E6E80]">Nothing queued or sent yet.</p>
        ) : (
          <div className="max-h-[340px] overflow-auto rounded-xl border border-[#1E1E2E]">
            <table className="w-full min-w-[640px]">
              <thead className="sticky top-0 bg-[#12121A]">
                <tr>
                  {["When", "Channel", "Template", "To", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E80]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E2E]">
                {data.messages.map((message) => (
                  <tr key={message.id}>
                    <td className="px-3 py-2 text-[11.5px] text-[#6E6E80]">
                      {when(message.sent_at ?? message.scheduled_for)}
                    </td>
                    <td className="px-3 py-2 text-[12px] capitalize text-[#A0A0B0]">
                      {message.channel}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[#A0A0B0]">
                      {message.template_key ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[11.5px] text-[#6E6E80]">
                      {message.recipient_email ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-[11.5px]"
                        style={{ color: STATUS_COLOUR[message.status] ?? "#A0A0B0" }}
                      >
                        {message.status}
                      </span>
                      {message.error_message && (
                        <span className="ml-2 text-[11px] text-[#FF6B6B]">
                          {message.error_message.slice(0, 70)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Timeline */}
        <Panel title="Activity" note="Built from what happened, not from steps clicked.">
          {data.timeline.length === 0 ? (
            <p className="text-[13px] text-[#6E6E80]">Nothing yet.</p>
          ) : (
            <ol className="space-y-2.5">
              {data.timeline.map((event, index) => (
                <li key={`${event.at}-${index}`} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6C47FF]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-white">{event.label}</span>
                    <span className="block text-[11px] text-[#6E6E80]">{when(event.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {/* Feature flags */}
        <Panel
          title="Feature flags"
          note="Turn something on for this account alone, without a deploy."
        >
          {data.flags.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {data.flags.map((flag) => (
                <li key={flag.id} className="flex items-center gap-2 text-[12.5px]">
                  <code className="text-[#00D4FF]">{flag.flag_name}</code>
                  <button
                    onClick={() =>
                      patch(
                        { setFlag: { name: flag.flag_name, enabled: !flag.is_enabled } },
                        "flag"
                      )
                    }
                    className="ml-auto text-[11.5px]"
                    style={{ color: flag.is_enabled ? "#00C851" : "#6E6E80" }}
                  >
                    {flag.is_enabled ? "enabled" : "disabled"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <NewFlag
            onAdd={(name) => patch({ setFlag: { name, enabled: true } }, "flag")}
            busy={busy === "flag"}
          />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Invoices">
          {data.invoices.length === 0 ? (
            <p className="text-[13px] text-[#6E6E80]">No payments.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center gap-3 text-[12.5px]">
                  <span className="text-[#6E6E80]">{when(invoice.paid_at ?? invoice.created_at)}</span>
                  <span className="text-white">{money(Number(invoice.amount), invoice.currency)}</span>
                  <span className="capitalize text-[#A0A0B0]">{invoice.plan_slug}</span>
                  <span
                    className="ml-auto"
                    style={{ color: STATUS_COLOUR[invoice.status] ?? "#A0A0B0" }}
                  >
                    {invoice.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Webinars">
          {data.webinars.length === 0 ? (
            <p className="text-[13px] text-[#6E6E80]">None created.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.webinars.map((webinar) => (
                <li key={webinar.id} className="flex items-center gap-3 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-white">{webinar.title}</span>
                  {!webinar.video_url && (
                    <span className="text-[11px] text-[#FFB020]">no video</span>
                  )}
                  <span
                    className="capitalize"
                    style={{ color: webinar.status === "published" ? "#00C851" : "#6E6E80" }}
                  >
                    {webinar.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {(data.errors.length > 0 || data.adminActions.length > 0 || data.impersonations.length > 0) && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Errors they hit">
            {data.errors.length === 0 ? (
              <p className="text-[13px] text-[#6E6E80]">None recorded.</p>
            ) : (
              <ul className="space-y-2">
                {data.errors.map((error, index) => (
                  <li key={index} className="text-[11.5px]">
                    <span className="block text-[#FF6B6B]">{error.error_message.slice(0, 90)}</span>
                    <span className="block text-[#6E6E80]">{when(error.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Admin actions">
            {data.adminActions.length === 0 ? (
              <p className="text-[13px] text-[#6E6E80]">None.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.adminActions.map((action, index) => (
                  <li key={index} className="text-[11.5px]">
                    <span className="text-white">{action.action.replace(/_/g, " ")}</span>
                    <span className="block text-[#6E6E80]">{when(action.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Impersonations">
            {data.impersonations.length === 0 ? (
              <p className="text-[13px] text-[#6E6E80]">Never impersonated.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.impersonations.map((row, index) => (
                  <li key={index} className="text-[11.5px]">
                    <span className="text-white">{row.reason ?? "no reason given"}</span>
                    <span className="block text-[#6E6E80]">
                      {when(row.started_at)}
                      {row.ended_at ? "" : " · still open"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
        {label}
      </p>
      <p className="mt-1.5 text-[20px] font-semibold capitalize tabular-nums tracking-[-0.02em] text-white">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] capitalize text-[#6E6E80]">{sub}</p>}
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
      <h2 className="text-[14px] font-semibold text-white">{title}</h2>
      {note && <p className="mt-0.5 mb-3 text-[11.5px] leading-relaxed text-[#6E6E80]">{note}</p>}
      {!note && <div className="mb-3" />}
      {children}
    </section>
  );
}

function NewFlag({
  onAdd,
  busy,
}: {
  onAdd: (name: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [name, setName] = useState("");

  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(event) =>
          setName(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
        }
        placeholder="new_flag_name"
        className="h-9 flex-1 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 font-mono text-[12px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
      />
      <button
        onClick={async () => {
          if (!name) return;
          if (await onAdd(name)) setName("");
        }}
        disabled={busy || !name}
        className="inline-flex h-9 items-center rounded-lg border border-[#2A2A3A] px-3 text-[12px] text-white hover:border-[#6C47FF]/50 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enable"}
      </button>
    </div>
  );
}
