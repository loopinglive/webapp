"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Play, Star, Trash2, Upload } from "lucide-react";

import { useVoiceClone } from "@/hooks/useVoiceClone";
import { useToast } from "@/components/ui/ToastProvider";

const SAMPLE_LINE = "Hey — welcome to the webinar. I'm really glad you could make it today.";

/**
 * A cloned voice needs 25+ seconds of clean, single-speaker speech.
 * ElevenLabs' own add-voice call is synchronous, so uploading a sample and
 * getting back a usable, testable voice happens in one flow with no
 * separate "processing" wait.
 */
export function VoiceCloneStudio() {
  const { clones, loading, createClone, removeClone, makePrimary, test } = useVoiceClone();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [cloneName, setCloneName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [testText, setTestText] = useState(SAMPLE_LINE);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function handleFile(file: File) {
    if (!cloneName.trim()) {
      setUploadError("Name the voice before uploading a sample.");
      return;
    }
    setUploading(true);
    setUploadError(null);

    try {
      const signResponse = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "audio" }),
      });
      const signed = (await signResponse.json()) as {
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        folder: string;
        type: string;
        resourceType: string;
        error?: string;
      };
      if (!signResponse.ok) throw new Error(signed.error ?? "Could not start the upload.");

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signed.apiKey);
      form.append("timestamp", String(signed.timestamp));
      form.append("signature", signed.signature);
      form.append("folder", signed.folder);
      if (signed.type) form.append("type", signed.type);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`,
        { method: "POST", body: form }
      );
      const uploaded = (await uploadResponse.json()) as { public_id?: string };
      if (!uploadResponse.ok || !uploaded.public_id) throw new Error("The upload was rejected. Please try again.");

      const result = await createClone(uploaded.public_id, cloneName.trim());
      if (!result.ok) throw new Error(result.error ?? "Could not create the voice clone.");

      toast.success("Voice cloned.");
      setCloneName("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleTest(voiceCloneId: string) {
    if (!testText.trim()) return;
    setTestingId(voiceCloneId);
    setAudioUrl(null);

    const result = await test(voiceCloneId, testText);
    setTestingId(null);

    if (!result.ok || !result.audioUrl) {
      toast.error(result.error ?? "Could not synthesise that line.");
      return;
    }
    setAudioUrl(result.audioUrl);
    setTimeout(() => audioRef.current?.play(), 0);
  }

  async function handleRemove(id: string) {
    const result = await removeClone(id);
    if (!result.ok) toast.error(result.error ?? "Could not delete that voice.");
  }

  async function handlePrimary(id: string) {
    const result = await makePrimary(id);
    if (!result.ok) toast.error(result.error ?? "Could not set that as your default voice.");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent-soft">
          <Mic className="h-4 w-4" />
        </span>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Voice cloning</h1>
      </div>
      <p className="mt-2 text-[13px] text-ink-muted">
        Upload 25 seconds or more of clean, single-speaker audio — your own voice, read naturally —
        and the autonomous builder can narrate webinars in it instead of a stock voice.
      </p>

      <div className="mt-7 space-y-3 rounded-xl border border-hairline bg-surface p-4">
        <label className="block">
          <span className="text-[12.5px] text-ink-muted">Voice name</span>
          <input
            value={cloneName}
            onChange={(event) => setCloneName(event.target.value)}
            placeholder="My voice"
            className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>

        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-[13px] text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Cloning…" : "Upload sample audio"}
        </button>

        {uploadError && <p className="text-[12.5px] text-[#FF6B6B]">{uploadError}</p>}
      </div>

      <div className="mt-7">
        <span className="text-[12.5px] text-ink-muted">Test line</span>
        <input
          value={testText}
          onChange={(event) => setTestText(event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-[12.5px] text-ink-faint">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : clones.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">No cloned voices yet.</p>
        ) : (
          clones.map((clone) => (
            <div
              key={clone.id}
              className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[13.5px] text-ink">{clone.clone_name}</span>
                {clone.is_primary && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10.5px] font-medium text-accent-soft">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => void handleTest(clone.id)}
                  disabled={testingId === clone.id}
                  title="Play test line"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
                >
                  {testingId === clone.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </button>
                {!clone.is_primary && (
                  <button
                    onClick={() => void handlePrimary(clone.id)}
                    title="Make default"
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => void handleRemove(clone.id)}
                  title="Delete"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-[#FF6B6B]/10 hover:text-[#FF6B6B]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="mt-4 w-full" />}
    </div>
  );
}
