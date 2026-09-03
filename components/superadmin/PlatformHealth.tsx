"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, RefreshCw, XCircle } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows, SkeletonTiles } from "@/components/ui/Skeleton";

type Cron = {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  failures_24h: number;
  runs_24h: number;
  expected_runs_24h: number | null;
  verdict: "healthy" | "failing" | "silent" | "behind" | "paused";
};

type Health = {
  crons: Cron[];
  queue: { pending: number; overdue: number };
  webhooks: {
    total24h: number;
    delivered: number;
    permanentlyFailed: number;
    failureRate: number;
  };
  messages: { total7d: number; sent: number; failed: number; failureRate: number };
  errors24h: number;
  providers: Record<string, boolean>;
};

const VERDICT = {
  healthy: { colour: "#00C851", label: "Healthy", icon: CheckCircle2 },
  behind: { colour: "#FFB020", label: "Behind schedule", icon: AlertTriangle },
  failing: { colour: "#FF5A5A", label: "Failing", icon: XCircle },
  silent: { colour: "#FF5A5A", label: "Not running", icon: XCircle },
  paused: { colour: "#6E6E80", label: "Paused", icon: Circle },
};

const PROVIDER_LABELS: Record<string, string> = {
  email: "Email (Resend)",
  sms: "SMS (Twilio)",
  whatsapp: "WhatsApp (Twilio)",
  stripe: "Stripe",
  stripeWebhooks: "Stripe webhooks",
  anthropic: "Anthropic (AI replies)",
  cloudinary: "Cloudinary",
};

export function PlatformHealth() {
  const [data, setData] = useState<Health | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/superadmin/health", { cache: "no-store" });
      if (response.ok) setData((await response.json()) as Health);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (!data) {
    return (
      <div className="space-y-5 px-6 py-6 lg:px-8">
        <SkeletonTiles count={4} />
        <SkeletonRows rows={7} columns={5} />
      </div>
    );
  }

  const unhealthy = data.crons.filter((c) => c.verdict !== "healthy" && c.active);
  const missingProviders = Object.entries(data.providers).filter(([, ok]) => !ok);

  return (
    <div className="space-y-6 px-6 py-6 lg:px-8">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#6E6E80]">
          {unhealthy.length === 0
            ? "All scheduled jobs are running as expected."
            : `${unhealthy.length} job${unhealthy.length === 1 ? "" : "s"} needs attention.`}
        </p>
        <button
          onClick={load}
          disabled={refreshing}
          className="inline-flex h-8 items-center gap-2 rounded-full border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={refreshing ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
          Refresh
        </button>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="Queued messages"
          value={data.queue.pending.toLocaleString()}
          hint={data.queue.overdue > 0 ? `${data.queue.overdue} overdue` : "none overdue"}
          bad={data.queue.overdue > 0}
        />
        <Tile
          label="Webhook failures"
          value={`${data.webhooks.failureRate}%`}
          hint={`${data.webhooks.total24h} sent in 24h`}
          bad={data.webhooks.failureRate > 10}
        />
        <Tile
          label="Message failures"
          value={`${data.messages.failureRate}%`}
          hint={`${data.messages.total7d} in 7 days`}
          bad={data.messages.failureRate > 5}
        />
        <Tile
          label="Errors (24h)"
          value={data.errors24h.toLocaleString()}
          hint={data.errors24h === 0 ? "nothing logged" : "see Errors"}
          bad={data.errors24h > 20}
        />
      </div>

      {/* Cron jobs */}
      <section>
        <h2 className="text-[15px] font-semibold text-white">Scheduled jobs</h2>
        <p className="mt-0.5 text-[12.5px] text-[#6E6E80]">
          All seven run in Postgres via pg_cron. &ldquo;Behind schedule&rdquo; means the
          runs that happened succeeded, but fewer happened than the schedule implies.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[#1E1E2E]">
          <table className="w-full min-w-[760px]">
            <thead className="bg-[#12121A]">
              <tr>
                {["Job", "Schedule", "State", "Last run", "Duration", "Runs / 24h"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2E]">
              {data.crons.map((job) => {
                const verdict = VERDICT[job.verdict];
                const Icon = verdict.icon;

                return (
                  <tr key={job.jobname}>
                    <td className="px-4 py-3 font-mono text-[12px] text-white">
                      {job.jobname.replace("loopinglive-", "")}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11.5px] text-[#6E6E80]">
                      {job.schedule}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-[12px]"
                        style={{ color: verdict.colour }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {verdict.label}
                      </span>
                      {job.failures_24h > 0 && (
                        <span className="ml-2 text-[11px] text-[#FF6B6B]">
                          {job.failures_24h} failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#A0A0B0]">
                      {job.last_run
                        ? new Date(job.last_run).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "never"}
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-[#A0A0B0]">
                      {job.last_duration_ms === null ? "—" : `${job.last_duration_ms} ms`}
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-[#A0A0B0]">
                      {job.runs_24h}
                      {job.expected_runs_24h !== null && (
                        <span className="text-[#4A4A5C]"> / {job.expected_runs_24h}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Providers */}
      <section>
        <h2 className="text-[15px] font-semibold text-white">Third-party services</h2>
        <p className="mt-0.5 text-[12.5px] text-[#6E6E80]">
          Whether a usable credential is present. A placeholder key counts as missing —
          that is exactly the mistake this is here to catch.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(data.providers).map(([key, ok]) => (
            <div
              key={key}
              className="flex items-center gap-2.5 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
            >
              {ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00C851]" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-[#FF5A5A]" />
              )}
              <span className="flex-1 text-[13px] text-white">
                {PROVIDER_LABELS[key] ?? key}
              </span>
              <span
                className="text-[11.5px]"
                style={{ color: ok ? "#00C851" : "#FF6B6B" }}
              >
                {ok ? "configured" : "missing"}
              </span>
            </div>
          ))}
        </div>

        {missingProviders.length > 0 && (
          <p className="mt-3 rounded-xl bg-[#FFB020]/10 px-4 py-3 text-[12.5px] text-[#FFB020]">
            {missingProviders.length} service
            {missingProviders.length === 1 ? " is" : "s are"} unconfigured. Anything
            depending on them fails silently rather than loudly.
          </p>
        )}
      </section>

      {data.crons.length === 0 && (
        <EmptyState
          icon="⏱️"
          title="No scheduled jobs found"
          description="pg_cron reported nothing, which usually means the extension is not enabled on this database."
        />
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  bad,
}: {
  label: string;
  value: string;
  hint: string;
  bad?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]">
        {label}
      </p>
      <p
        className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-[-0.02em]"
        style={{ color: bad ? "#FF6B6B" : "#FFFFFF" }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-[#6E6E80]">{hint}</p>
    </div>
  );
}
