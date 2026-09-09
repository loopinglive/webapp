"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type Point = { metric_value: number; status: "healthy" | "warning" | "critical"; recorded_at: string };
type MetricHistory = {
  definition: { name: string; label: string; unit: string; thresholdWarning: number; thresholdCritical: number };
  points: Point[];
};

const STATUS_STYLE = {
  healthy: { colour: "#00C851", icon: CheckCircle2, label: "Healthy" },
  warning: { colour: "#FFB020", icon: AlertTriangle, label: "Warning" },
  critical: { colour: "#FF5A5A", icon: XCircle, label: "Critical" },
};

/**
 * The trend the live health page can't show: whether each tracked metric is
 * getting worse over the last week, recorded hourly by its own cron rather
 * than computed fresh on every page load.
 */
export function PlatformHealthHistory() {
  const [metrics, setMetrics] = useState<MetricHistory[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch("/api/superadmin/health-history", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((payload: { metrics: MetricHistory[] } | null) => {
          if (payload) setMetrics(payload.metrics);
        });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!metrics) return null;

  return (
    <section className="px-6 pb-6 lg:px-8">
      <h2 className="text-[15px] font-semibold text-ink">7-day trend</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-faint">
        Recorded hourly, so a slow decline is visible before it looks unhealthy on its own.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const latest = metric.points[metric.points.length - 1];
          const style = latest ? STATUS_STYLE[latest.status] : null;
          const Icon = style?.icon;
          const max = Math.max(metric.definition.thresholdCritical, ...metric.points.map((p) => p.metric_value), 1);

          return (
            <div key={metric.definition.name} className="rounded-xl border border-hairline bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  {metric.definition.label}
                </span>
                {style && Icon && (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: style.colour }}>
                    <Icon className="h-3 w-3" />
                    {style.label}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-xl font-semibold tabular-nums text-ink">
                {latest ? latest.metric_value : "—"}
                <span className="ml-1 text-[12px] font-normal text-ink-faint">{metric.definition.unit}</span>
              </p>

              {metric.points.length > 1 && (
                <div className="mt-3 flex h-8 items-end gap-[2px]">
                  {metric.points.slice(-48).map((point, index) => (
                    <span
                      key={index}
                      className={cn("flex-1 rounded-sm", point.status !== "healthy" && "opacity-90")}
                      style={{
                        height: `${Math.max(8, (point.metric_value / max) * 100)}%`,
                        backgroundColor: STATUS_STYLE[point.status].colour,
                        opacity: point.status === "healthy" ? 0.35 : 0.9,
                      }}
                    />
                  ))}
                </div>
              )}

              {metric.points.length === 0 && (
                <p className="mt-2 text-[11px] text-ink-faint">No snapshots yet — the hourly cron hasn&apos;t run.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
