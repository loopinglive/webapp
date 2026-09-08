"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, TriangleAlert } from "lucide-react";

import { useAutonomousStatus } from "@/hooks/useAutonomousBuilder";

const STEPS: { key: string; label: string; column: string }[] = [
  { key: "script", label: "Writing script", column: "script_generated_at" },
  { key: "presentation", label: "Designing slides", column: "presentation_generated_at" },
  { key: "voice", label: "Recording voice-over", column: "voice_cloned_at" },
  { key: "video", label: "Assembling video", column: "video_assembled_at" },
  { key: "personas", label: "Generating live audience", column: "personas_generated_at" },
  { key: "automation", label: "Configuring follow-up", column: "automation_configured_at" },
];

export function GenerationPipeline({ webinarId }: { webinarId: string }) {
  const router = useRouter();
  const { job, webinar, loading, error } = useAutonomousStatus(webinarId);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function publish() {
    setPublishing(true);
    setPublishError(null);

    const response = await fetch("/api/autonomous/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; missing?: string[] };
    setPublishing(false);

    if (!response.ok) {
      setPublishError(payload.error ?? "Could not publish.");
      return;
    }
    router.push("/admin/dashboard");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-faint" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center text-[13px] text-ink-muted">
        {error ?? "This generation job could not be found."}
      </div>
    );
  }

  const failedStepIndex = job.generation_log
    .slice()
    .reverse()
    .find((entry) => entry.status === "failed");

  return (
    <div className="mx-auto max-w-xl px-6 py-8 lg:px-10">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
        {webinar?.title ?? "Your webinar"}
      </h1>
      <p className="mt-1.5 text-[13px] text-ink-muted">
        {job.generation_status === "ready"
          ? "Generation complete — review it below before publishing."
          : job.generation_status === "failed"
            ? "Generation stopped."
            : `Generating${job.estimated_completion_minutes ? ` — usually takes about ${job.estimated_completion_minutes} minutes` : ""}…`}
      </p>

      <div className="mt-7 space-y-1">
        {STEPS.map((step, index) => {
          const done = Boolean((job as unknown as Record<string, string | null>)[step.column]);
          const isFailedStep = job.generation_status === "failed" && failedStepIndex?.step === step.key;
          const previousDone = index === 0 || Boolean((job as unknown as Record<string, string | null>)[STEPS[index - 1].column]);
          const running = !done && previousDone && job.generation_status !== "failed" && job.generation_status !== "ready";

          return (
            <div key={step.key} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5">
              {isFailedStep ? (
                <TriangleAlert className="h-4 w-4 shrink-0 text-[#FF6B6B]" />
              ) : done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-soft" />
              ) : running ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-faint" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-ink-faint" />
              )}
              <span className={`text-[13.5px] ${done ? "text-ink" : isFailedStep ? "text-[#FF6B6B]" : "text-ink-muted"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {job.generation_status === "failed" && (
        <div className="mt-5 rounded-xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/8 px-4 py-3.5">
          <p className="text-[12.5px] text-[#FF6B6B]">{job.error ?? "Something went wrong during generation."}</p>
        </div>
      )}

      {job.generation_status === "ready" && webinar && (
        <div className="mt-7 space-y-4">
          {webinar.video_url && (
            <video
              src={webinar.video_url}
              poster={webinar.thumbnail_url ?? undefined}
              controls
              className="w-full rounded-xl border border-hairline bg-surface"
            />
          )}

          {publishError && <p className="text-[12.5px] text-[#FF6B6B]">{publishError}</p>}

          <div className="flex gap-2.5">
            <button
              onClick={() => void publish()}
              disabled={publishing}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
            >
              {publishing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Publish
            </button>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="inline-flex h-11 items-center justify-center rounded-full border border-hairline px-6 text-[13.5px] text-ink-muted hover:text-ink"
            >
              Review later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
