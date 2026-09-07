/**
 * Platform health metrics — pure threshold classification, no database access.
 *
 * The live `/superadmin/health` page already answers "is it working right
 * now". This is the complementary question: "is it getting worse over
 * time" — a fixed set of named metrics, recorded hourly, so a slow decline
 * (webhook failures creeping from 1% to 4% to 9% over a week) is visible
 * before it crosses into what the live page would call unhealthy.
 */

export type MetricStatus = "healthy" | "warning" | "critical";

export type MetricDefinition = {
  name: string;
  label: string;
  unit: string;
  thresholdWarning: number;
  thresholdCritical: number;
};

export const HEALTH_METRICS: MetricDefinition[] = [
  { name: "webhook_failure_rate", label: "Webhook failure rate", unit: "%", thresholdWarning: 5, thresholdCritical: 15 },
  { name: "message_failure_rate", label: "Message failure rate", unit: "%", thresholdWarning: 3, thresholdCritical: 10 },
  { name: "error_count_24h", label: "Errors (24h)", unit: "count", thresholdWarning: 10, thresholdCritical: 50 },
  { name: "cron_failure_count", label: "Failing cron jobs", unit: "count", thresholdWarning: 1, thresholdCritical: 3 },
  { name: "queue_overdue_count", label: "Overdue queued messages", unit: "count", thresholdWarning: 5, thresholdCritical: 25 },
];

/** Every metric here is "higher is worse" — none of the five tracked values has a healthy direction that goes up. */
export function classifyMetric(value: number, thresholdWarning: number, thresholdCritical: number): MetricStatus {
  if (value >= thresholdCritical) return "critical";
  if (value >= thresholdWarning) return "warning";
  return "healthy";
}
