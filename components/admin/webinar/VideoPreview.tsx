"use client";

import { Clock, Film } from "lucide-react";

import { formatOffset } from "@/lib/utils";

/**
 * Plays the host's own video back to them.
 *
 * The `src` is a storage URL, so it goes on the element and never into text —
 * no filename, no path, no provider name anywhere in the UI.
 */
export function VideoPreview({
  src,
  durationSeconds,
  poster,
  label = "Your webinar video",
}: {
  src: string | null;
  durationSeconds: number | null;
  poster?: string | null;
  label?: string;
}) {
  if (!src) {
    return (
      <div className="grid aspect-video place-items-center rounded-xl border border-[#1E1E2E] bg-[#12121A] text-center">
        <div>
          <Film className="mx-auto h-6 w-6 text-[#3A3A4A]" />
          <p className="mt-2 text-[12.5px] text-[#A0A0B0]">No video yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E1E2E] bg-black">
      <video
        src={src}
        poster={poster ?? undefined}
        controls
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={(event) => event.preventDefault()}
        className="aspect-video w-full bg-black"
      />
      <div className="flex items-center justify-between gap-3 bg-[#12121A] px-4 py-2.5">
        <span className="truncate text-[12.5px] text-white">{label}</span>
        {durationSeconds ? (
          <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] tabular-nums text-[#A0A0B0]">
            <Clock className="h-3 w-3" />
            {formatOffset(durationSeconds)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
