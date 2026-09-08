import "server-only";

import { cloudinary } from "@/lib/cloudinary";

/**
 * Assembles slide images + a narration track into one video, using
 * Cloudinary's own transformation pipeline rather than running FFmpeg in a
 * Vercel function — there is no FFmpeg, no headless browser, and no video
 * processing of any kind anywhere else in this codebase (confirmed by
 * searching it), and encoding a 30-90 minute video would not fit inside this
 * deployment's proven ~300-second serverless ceiling regardless. Cloudinary
 * is already the video host for every other webinar in this app; this asks
 * it to do the encoding work too, the same architectural move multi-platform
 * streaming made with LiveKit's egress service in Phase 14.
 *
 * Deliberately built from three separately-materialized assets rather than
 * one giant nested transformation URL:
 *   1. splice the audio clips together, eager-render, re-upload the result
 *      as its own clean asset (narration)
 *   2. splice the slide images together (each with its own du_ duration),
 *      eager-render, re-upload as its own clean asset (silent slideshow)
 *   3. overlay the narration onto the slideshow with one flat l_audio layer
 * Each individual operation (fl_splice concatenation, du_ duration, l_audio
 * overlay) is a real parameter confirmed against Cloudinary's own
 * transformation reference. What is NOT independently verified against a
 * live account is nesting them — hence materializing between steps instead
 * of chaining nested layer transformations, which keeps every single
 * transformation call flat and within what's actually confirmed to work.
 * This is still the one step in the pipeline most worth a real smoke test
 * against a live Cloudinary account before depending on it in production.
 */

const MAX_CLIPS_PER_SPLICE = 15;

function cloudName(): string {
  const name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!name) throw new Error("Cloudinary is not configured on this deployment.");
  return name;
}

/**
 * Splices N same-type clips (video or image) into one sequence, materializes
 * the result via an eager transformation, then re-uploads the rendered URL
 * as a fresh, simple asset — so anything referencing it afterward is one
 * plain public_id, never a transformation chain.
 */
async function spliceAndMaterialize(
  publicIds: string[],
  resourceType: "video" | "image",
  folder: string,
  perClipDuration?: (index: number) => number
): Promise<{ publicId: string; durationSeconds: number | null }> {
  if (publicIds.length === 0) throw new Error("Nothing to splice.");
  const capped = publicIds.slice(0, MAX_CLIPS_PER_SPLICE);

  // The Node SDK's typed transformation objects don't have a first-class
  // "per-layer duration before splice" field, so the duration is applied as
  // a raw transformation string component instead — still one flat operation
  // per layer, not nested.
  const rawTransformation = capped
    .slice(1)
    .map((publicId, index) => {
      const duration = perClipDuration ? `du_${Math.max(1, Math.round(perClipDuration(index + 1)))},` : "";
      return `l_${resourceType}:${publicId.replace(/\//g, ":")},${duration}fl_splice/fl_layer_apply`;
    })
    .join("/");

  const firstDuration = perClipDuration ? Math.max(1, Math.round(perClipDuration(0))) : undefined;
  const baseTransform = firstDuration ? `du_${firstDuration}` : undefined;

  const eagerTransformation = [baseTransform, rawTransformation].filter(Boolean).join("/");

  const result = await cloudinary.uploader.explicit(capped[0], {
    type: "upload",
    resource_type: resourceType,
    eager: [{ raw_transformation: eagerTransformation }],
    eager_async: false,
  });

  const rendered = result?.eager?.[0]?.secure_url as string | undefined;
  if (!rendered) {
    throw new Error("Cloudinary did not return a rendered result for the spliced sequence.");
  }

  const reuploaded = await cloudinary.uploader.upload(rendered, {
    resource_type: resourceType === "image" ? "video" : resourceType,
    folder,
  });

  return { publicId: reuploaded.public_id, durationSeconds: reuploaded.duration ?? null };
}

export type AssemblySlide = { publicId: string; durationSeconds: number };

/**
 * Full assembly: splice narration clips, splice slide images (timed to match
 * how long each section actually takes to say), overlay one onto the other.
 * Returns the finished, directly playable video URL.
 */
export async function assembleVideo(params: {
  autonomousWebinarId: string;
  narrationClipPublicIds: string[];
  slides: AssemblySlide[];
}): Promise<string> {
  const narration = await spliceAndMaterialize(
    params.narrationClipPublicIds,
    "video",
    `autonomous/${params.autonomousWebinarId}/narration`
  );

  const slideshow = await spliceAndMaterialize(
    params.slides.map((slide) => slide.publicId),
    "image",
    `autonomous/${params.autonomousWebinarId}/slideshow`,
    (index) => params.slides[index]?.durationSeconds ?? 15
  );

  const finalUrl = `https://res.cloudinary.com/${cloudName()}/video/upload/l_video:${narration.publicId.replace(/\//g, ":")}/fl_layer_apply/f_mp4,q_auto/${slideshow.publicId}.mp4`;

  const check = await fetch(finalUrl, { method: "HEAD" });
  if (!check.ok) {
    throw new Error(`Cloudinary could not render the final assembled video (HTTP ${check.status}).`);
  }
  const contentType = check.headers.get("content-type") ?? "";
  if (!contentType.startsWith("video/")) {
    throw new Error(`Cloudinary returned "${contentType}" instead of a video for the final assembly.`);
  }

  return finalUrl;
}
