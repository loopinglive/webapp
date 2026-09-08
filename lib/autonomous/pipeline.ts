import "server-only";

import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";
import type { AutonomousWebinarRow, Json } from "@/types/database";

export const PIPELINE_STEPS = [
  "script",
  "presentation",
  "voice",
  "video",
  "personas",
  "automation",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];
export type StepStatus = "pending" | "running" | "complete" | "failed";

export type GenerationConfig = {
  topic: string;
  audience: string;
  offer: string;
  price: string;
  niche: string;
  lengthMinutes: number;
  tone: string;
  voiceId: string | null;
  voiceCloneId: string | null;
  theme: string;
};

type LogEntry = { step: PipelineStep; status: StepStatus; at: string; detail?: string };

/** Appends one entry to the generation log — the log is the audit trail a host sees in the status monitor. */
export async function logStep(
  autonomousWebinarId: string,
  step: PipelineStep,
  status: StepStatus,
  detail?: string
): Promise<void> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("autonomous_webinars")
    .select("generation_log")
    .eq("id", autonomousWebinarId)
    .maybeSingle();

  const log = ((data?.generation_log as LogEntry[] | null) ?? []).concat({
    step,
    status,
    at: new Date().toISOString(),
    detail,
  });

  const columnByStep: Record<PipelineStep, keyof AutonomousWebinarRow> = {
    script: "script_generated_at",
    presentation: "presentation_generated_at",
    voice: "voice_cloned_at",
    video: "video_assembled_at",
    personas: "personas_generated_at",
    automation: "automation_configured_at",
  };

  const update: Partial<AutonomousWebinarRow> = { generation_log: log as Json };
  if (status === "complete") (update as Record<string, string>)[columnByStep[step]] = new Date().toISOString();
  if (status === "failed") update.error = detail ?? "Unknown error";
  if (status !== "failed") update.generation_status = status === "complete" && step === "automation" ? "ready" : "generating";

  await supabase.from("autonomous_webinars").update(update).eq("id", autonomousWebinarId);
}

export async function markFailed(autonomousWebinarId: string, step: PipelineStep, error: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("autonomous_webinars")
    .update({ generation_status: "failed", error: `${step}: ${error}` })
    .eq("id", autonomousWebinarId);
  await logStep(autonomousWebinarId, step, "failed", error);
}

/**
 * Hands off to the next pipeline step as a separate serverless invocation.
 *
 * A single function running script generation through video assembly would
 * comfortably exceed this deployment's proven 300-second ceiling (see the
 * cron and convert routes already running at that limit) for anything but
 * the shortest webinar. Each step is its own route; this is what chains them
 * — a fire-and-forget HTTP call, the same pattern dispatchWebhookInBackground
 * and dispatchPluginEventInBackground already use elsewhere in this codebase
 * for "start this and don't make the caller wait for it."
 */
export function triggerNextStep(path: string, body: Record<string, unknown>): void {
  fetch(`${SITE.url}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Autonomous-Pipeline-Secret": process.env.CRON_SECRET ?? "",
    },
    body: JSON.stringify(body),
  }).catch(() => {
    // The step this was meant to trigger simply never runs; its own row stays
    // "generating" and the host sees a stalled pipeline rather than a silent
    // false success — visible, not swallowed.
  });
}

/** Every pipeline route checks this instead of a user session — steps 2 onward run server-to-server. */
export function verifyPipelineSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("X-Autonomous-Pipeline-Secret") === secret;
}
