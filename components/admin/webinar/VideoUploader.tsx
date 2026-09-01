"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Film, Loader2, UploadCloud } from "lucide-react";

import { AdminButton } from "@/components/admin/ui/Field";
import { useVideoUpload, type UploadKind } from "@/hooks/useVideoUpload";
import { cn, formatOffset } from "@/lib/utils";

const ACCEPT = {
  video: "video/mp4,video/quicktime,video/x-msvideo,video/x-matroska",
  image: "image/png,image/jpeg,image/webp",
  pdf: "application/pdf",
} as const;

const LABELS = {
  video: { title: "Drop your webinar video here", hint: "MP4, MOV, AVI or MKV" },
  image: { title: "Drop an image here", hint: "PNG, JPG or WebP" },
  pdf: { title: "Drop a PDF here", hint: "PDF up to 25MB" },
} as const;

type Props = {
  kind: UploadKind;
  webinarId?: string;
  target?: "thumbnail" | "avatar" | "handout";
  onComplete?: (result: { durationSeconds?: number; url?: string }) => void;
  /** Already-uploaded state, so re-visiting the step shows what is there. */
  existingLabel?: string | null;
};

/**
 * The upload surface.
 *
 * Deliberately says nothing about where files go. The host uploads "your
 * webinar video"; the storage provider is our problem, not theirs.
 */
export function VideoUploader({
  kind,
  webinarId,
  target,
  onComplete,
  existingLabel,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, cancel, reset, status, progress, secondsRemaining, error } =
    useVideoUpload({ kind, webinarId, target, onComplete });

  const handle = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) void upload(file);
    },
    [upload]
  );

  if (status === "complete" || (status === "idle" && existingLabel)) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#00C851]/30 bg-[#00C851]/8 px-4 py-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00C851]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-white">
            {status === "complete" ? "Upload complete" : "Already uploaded"}
          </p>
          {existingLabel && (
            <p className="truncate text-[12px] text-[#A0A0B0]">{existingLabel}</p>
          )}
        </div>
        <AdminButton
          variant="secondary"
          onClick={() => {
            reset();
            inputRef.current?.click();
          }}
        >
          Replace
        </AdminButton>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT[kind]}
          hidden
          onChange={(event) => handle(event.target.files)}
        />
      </div>
    );
  }

  if (status === "uploading" || status === "processing") {
    return (
      <div className="rounded-xl border border-[#6C47FF]/40 bg-[#6C47FF]/6 px-5 py-6">
        <div className="flex items-center gap-3">
          {status === "processing" ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          ) : (
            <Film className="h-5 w-5 text-[#6C47FF]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-white">
              {status === "processing"
                ? "Processing your video…"
                : `Uploading your video… ${Math.round(progress)}%`}
            </p>
            <p className="text-[12px] text-[#A0A0B0]">
              {status === "processing"
                ? "Almost there. This can take a moment for long recordings."
                : secondsRemaining !== null
                  ? `About ${formatOffset(secondsRemaining)} remaining`
                  : "Starting…"}
            </p>
          </div>
          {status === "uploading" && (
            <AdminButton variant="ghost" onClick={cancel}>
              Cancel
            </AdminButton>
          )}
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#1A1A2A]">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r from-[#6C47FF] to-[#00D4FF] transition-[width] duration-300",
              status === "processing" && "animate-pulse"
            )}
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handle(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14",
          "transition-colors duration-200",
          dragging
            ? "border-[#6C47FF] bg-[#6C47FF]/5"
            : "border-[#3A3A4A] hover:border-[#6C47FF] hover:bg-[#6C47FF]/5"
        )}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#6C47FF]/12">
          <UploadCloud className="h-5 w-5 text-[#6C47FF]" />
        </div>
        <p className="text-[14px] font-medium text-white">{LABELS[kind].title}</p>
        <p className="text-[12.5px] text-[#A0A0B0]">
          or click to browse · {LABELS[kind].hint}
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        hidden
        onChange={(event) => handle(event.target.files)}
      />

      {status === "error" && error && (
        <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-[#FF3B3B]/10 px-3.5 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#FF3B3B]" />
          <p className="flex-1 text-[12.5px] text-[#FF3B3B]">{error}</p>
          <AdminButton variant="secondary" onClick={() => inputRef.current?.click()}>
            Retry
          </AdminButton>
        </div>
      )}
    </div>
  );
}
