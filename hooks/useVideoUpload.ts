"use client";

import { useCallback, useRef, useState } from "react";

export type UploadStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "complete"
  | "error";

export type UploadKind = "video" | "image" | "pdf";

type Result = { durationSeconds?: number; url?: string };

type Options = {
  kind: UploadKind;
  webinarId?: string;
  target?: "thumbnail" | "avatar" | "handout";
  onComplete?: (result: Result) => void;
};

/**
 * Uploads a file straight to storage, with real progress.
 *
 * The signature comes from our server and the finished asset is confirmed by
 * our server; only the bytes go direct. That is what makes a 2GB recording
 * possible — routing it through a serverless function would exceed the request
 * body limit long before the file finished.
 *
 * XHR rather than fetch because fetch still cannot report upload progress.
 */
export function useVideoUpload({ kind, webinarId, target, onComplete }: Options) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const request = useRef<XMLHttpRequest | null>(null);

  const cancel = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setStatus("idle");
    setProgress(0);
    setSecondsRemaining(null);
  }, []);

  const upload = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setProgress(0);
      setError(null);
      setResult(null);

      try {
        const signResponse = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind }),
        });

        const signed = (await signResponse.json()) as {
          signature: string;
          timestamp: number;
          apiKey: string;
          cloudName: string;
          folder: string;
          resourceType: string;
          error?: string;
        };

        if (!signResponse.ok) {
          throw new Error(signed.error ?? "Could not start the upload.");
        }

        const form = new FormData();
        form.append("file", file);
        form.append("api_key", signed.apiKey);
        form.append("timestamp", String(signed.timestamp));
        form.append("signature", signed.signature);
        form.append("folder", signed.folder);

        const publicId = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          request.current = xhr;
          const startedAt = Date.now();

          xhr.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) return;
            const percent = (event.loaded / event.total) * 100;
            setProgress(percent);

            // Estimate from the rate so far — steadier than an instantaneous one.
            const elapsed = (Date.now() - startedAt) / 1000;
            const rate = event.loaded / Math.max(elapsed, 0.1);
            const left = (event.total - event.loaded) / Math.max(rate, 1);
            setSecondsRemaining(Number.isFinite(left) ? Math.round(left) : null);
          });

          xhr.addEventListener("load", () => {
            if (xhr.status < 200 || xhr.status >= 300) {
              reject(new Error("The upload was rejected. Please try again."));
              return;
            }
            try {
              const payload = JSON.parse(xhr.responseText) as { public_id: string };
              resolve(payload.public_id);
            } catch {
              reject(new Error("The upload finished but could not be read."));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error("The connection dropped during upload."))
          );
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

          xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${signed.cloudName}/${signed.resourceType}/upload`
          );
          xhr.send(form);
        });

        // Transcoding and duration probing happen after the bytes land.
        setStatus("processing");
        setProgress(100);
        setSecondsRemaining(null);

        const confirmResponse = await fetch("/api/admin/upload/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId, kind, webinarId, target }),
        });

        const confirmed = (await confirmResponse.json()) as Result & {
          error?: string;
        };

        if (!confirmResponse.ok) {
          throw new Error(confirmed.error ?? "That upload could not be saved.");
        }

        setResult(confirmed);
        setStatus("complete");
        onComplete?.(confirmed);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Upload failed.");
        setStatus("error");
      } finally {
        request.current = null;
      }
    },
    [kind, webinarId, target, onComplete]
  );

  return {
    upload,
    cancel,
    reset: () => {
      setStatus("idle");
      setProgress(0);
      setError(null);
      setResult(null);
    },
    status,
    progress,
    secondsRemaining,
    error,
    result,
  };
}
