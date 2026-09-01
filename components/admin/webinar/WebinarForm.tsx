"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { VideoPreview } from "@/components/admin/webinar/VideoPreview";
import { VideoUploader } from "@/components/admin/webinar/VideoUploader";
import { cn } from "@/lib/utils";

const STEPS = ["Basic details", "Upload video", "Thumbnail"] as const;

/**
 * Three steps rather than one long form.
 *
 * Step 1 creates the draft, so the video in step 2 has a webinar to attach to
 * and nothing is lost if the host stops halfway.
 */
export function WebinarForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [webinarId, setWebinarId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [details, setDetails] = useState({
    title: "",
    description: "",
    topic: "",
    offerDescription: "",
    webinarContext: "",
  });
  const [video, setVideo] = useState<{ durationSeconds?: number } | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  async function createDraft() {
    if (!details.title.trim() || !details.description.trim()) {
      setError("A title and description are required.");
      return;
    }

    setCreating(true);
    setError(null);

    const response = await fetch("/api/admin/webinar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    });

    const payload = (await response.json()) as {
      webinarId?: string;
      error?: string;
    };
    setCreating(false);

    if (!response.ok || !payload.webinarId) {
      setError(payload.error ?? "Could not create the webinar.");
      return;
    }

    setWebinarId(payload.webinarId);
    setStep(1);
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 lg:py-16">
      <button
        onClick={() => router.push("/admin/dashboard")}
        className="mb-8 inline-flex items-center gap-2 text-[13px] text-[#A0A0B0] transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </button>

      <ol className="mb-10 flex items-center gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold transition-colors",
                index < step
                  ? "bg-[#00C851] text-[#0A0A0F]"
                  : index === step
                    ? "bg-[#6C47FF] text-white"
                    : "bg-[#3A3A4A]/50 text-[#A0A0B0]"
              )}
            >
              {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden text-[12.5px] sm:block",
                index === step ? "text-white" : "text-[#A0A0B0]"
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-[#1E1E2E]" />
            )}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-5">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white">
              What is this webinar?
            </h1>
            <p className="mt-2 text-[13.5px] text-[#A0A0B0]">
              The last three fields are what your AI moderators read to answer
              questions in the room.
            </p>
          </div>

          <Field label="Webinar title" required>
            <TextInput
              value={details.title}
              onChange={(event) =>
                setDetails({ ...details, title: event.target.value })
              }
              placeholder="The 3-Offer Framework"
            />
          </Field>

          <Field label="Description" required>
            <TextArea
              rows={3}
              value={details.description}
              onChange={(event) =>
                setDetails({ ...details, description: event.target.value })
              }
              placeholder="What attendees will walk away with."
            />
          </Field>

          <Field
            label="Topic"
            hint="For your AI moderators"
            error={null}
          >
            <TextInput
              value={details.topic}
              onChange={(event) =>
                setDetails({ ...details, topic: event.target.value })
              }
              placeholder="Building one high-converting offer"
            />
          </Field>

          <Field label="What are you selling?" hint="For your AI moderators">
            <TextArea
              rows={2}
              value={details.offerDescription}
              onChange={(event) =>
                setDetails({ ...details, offerDescription: event.target.value })
              }
              placeholder="A $997 course covering the full system taught in the session."
            />
          </Field>

          <Field label="Anything else they should know?" hint="Optional">
            <TextArea
              rows={3}
              value={details.webinarContext}
              onChange={(event) =>
                setDetails({ ...details, webinarContext: event.target.value })
              }
              placeholder="Refund policy, bonuses, who this is not for…"
            />
          </Field>

          {error && <p className="text-[12.5px] text-[#FF3B3B]">{error}</p>}

          <AdminButton onClick={createDraft} disabled={creating} className="h-11">
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </AdminButton>
        </section>
      )}

      {step === 1 && webinarId && (
        <section className="space-y-5">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white">
              Upload your video
            </h1>
            <p className="mt-2 text-[13.5px] text-[#A0A0B0]">
              This is the recording that plays as your live session.
            </p>
          </div>

          <VideoUploader
            kind="video"
            webinarId={webinarId}
            onComplete={(result) => setVideo(result)}
          />

          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              onClick={() => setStep(2)}
              disabled={!video}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => setStep(2)}>
              Skip for now
            </AdminButton>
          </div>
        </section>
      )}

      {step === 2 && webinarId && (
        <section className="space-y-5">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-white">
              Add a thumbnail
            </h1>
            <p className="mt-2 text-[13.5px] text-[#A0A0B0]">
              Shown on your dashboard and behind the registration page.
            </p>
          </div>

          <VideoUploader
            kind="image"
            webinarId={webinarId}
            target="thumbnail"
            onComplete={(result) => setThumbnailUrl(result.url ?? null)}
          />

          {thumbnailUrl && (
            <VideoPreview
              src={null}
              durationSeconds={null}
              poster={thumbnailUrl}
            />
          )}

          <AdminButton
            onClick={() => router.push(`/admin/webinar/${webinarId}`)}
            className="h-11"
          >
            Finish setup
            <ArrowRight className="h-4 w-4" />
          </AdminButton>
        </section>
      )}
    </div>
  );
}
