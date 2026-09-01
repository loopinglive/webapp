"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";

import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { VideoPreview } from "@/components/admin/webinar/VideoPreview";
import { VideoUploader } from "@/components/admin/webinar/VideoUploader";
import {
  SectionHeader,
  useSetupContext,
} from "@/components/admin/webinar/WebinarSetupShell";

export function WebinarSettings({ webinarId }: { webinarId: string }) {
  const { webinar, updateWebinar, refresh } = useSetupContext();
  const [grabbing, setGrabbing] = useState(false);
  const [grabError, setGrabError] = useState<string | null>(null);

  async function grabFrame() {
    setGrabbing(true);
    setGrabError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/thumbnail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // A second in, so the frame is past any fade from black.
      body: JSON.stringify({ atSecond: 2 }),
    });

    setGrabbing(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setGrabError(payload.error ?? "Could not take a frame.");
      return;
    }

    refresh();
  }

  if (!webinar) return null;

  return (
    <>
      <SectionHeader
        title="Settings"
        description="Details, video and thumbnail. Changes save as you type."
      />

      <div className="grid max-w-5xl gap-8 px-6 py-8 lg:grid-cols-2 lg:px-8">
        <section className="space-y-5">
          <Field label="Webinar title" required>
            <TextInput
              defaultValue={webinar.title}
              onChange={(event) => updateWebinar({ title: event.target.value })}
            />
          </Field>

          <Field label="Description">
            <TextArea
              rows={3}
              defaultValue={webinar.description ?? ""}
              onChange={(event) =>
                updateWebinar({ description: event.target.value })
              }
            />
          </Field>

          <Field label="Topic" hint="Read by your AI moderators">
            <TextInput
              defaultValue={webinar.topic ?? ""}
              onChange={(event) => updateWebinar({ topic: event.target.value })}
            />
          </Field>

          <Field label="What are you selling?" hint="Read by your AI moderators">
            <TextArea
              rows={2}
              defaultValue={webinar.offer_description ?? ""}
              onChange={(event) =>
                updateWebinar({ offerDescription: event.target.value })
              }
            />
          </Field>

          <Field label="Extra context" hint="Optional">
            <TextArea
              rows={3}
              defaultValue={webinar.webinar_context ?? ""}
              onChange={(event) =>
                updateWebinar({ webinarContext: event.target.value })
              }
            />
          </Field>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
              Your video
            </h2>
            <VideoPreview
              src={webinar.video_url}
              durationSeconds={webinar.video_duration_seconds}
              poster={webinar.thumbnail_url}
            />
            <div className="mt-3">
              <VideoUploader
                kind="video"
                webinarId={webinarId}
                existingLabel={
                  webinar.video_url ? "Your webinar video" : null
                }
                onComplete={refresh}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-[#A0A0B0]">
              Replacing the video keeps your comment script. Check your timestamps
              still line up afterwards.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
              Thumbnail
            </h2>
            <VideoUploader
              kind="image"
              webinarId={webinarId}
              target="thumbnail"
              existingLabel={webinar.thumbnail_url ? "Thumbnail set" : null}
              onComplete={refresh}
            />

            {webinar.video_public_id && (
              <div className="mt-3">
                <AdminButton
                  variant="secondary"
                  onClick={grabFrame}
                  disabled={grabbing}
                >
                  {grabbing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  Use a frame from the video
                </AdminButton>
                {grabError && (
                  <p className="mt-2 text-[12px] text-[#FF3B3B]">{grabError}</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
