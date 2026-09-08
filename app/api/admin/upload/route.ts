import { NextResponse } from "next/server";

import { signUpload, uploadType } from "@/lib/cloudinary";
import { requireAccountAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

const FOLDERS = {
  video: "loopinglive/videos",
  image: "loopinglive/assets",
  pdf: "loopinglive/assets",
  audio: "loopinglive/voice-samples",
} as const;

type Kind = keyof typeof FOLDERS;

/**
 * Hands back a short-lived signature so the browser can upload straight to
 * storage.
 *
 * The Phase 3 spec proxies the file through this route instead. That cannot
 * work for the files this feature exists to carry: a one-hour webinar recording
 * is hundreds of megabytes to a couple of gigabytes, and a serverless request
 * body caps out around 4.5MB on Vercel. Uploading direct also gives the real
 * progress events the upload UI needs, which a proxied stream cannot.
 *
 * The privacy rule is unaffected — the admin UI never renders a storage URL,
 * and /confirm re-reads the asset server-side so the database records the
 * provider's own numbers rather than anything the client claims.
 */
export async function POST(request: Request) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const { kind } = (await request.json()) as { kind?: Kind };

  if (!kind || !(kind in FOLDERS)) {
    return NextResponse.json(
      { error: "kind must be video, image, pdf or audio" },
      { status: 400 }
    );
  }

  if (!process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: "Uploads are not configured yet." },
      { status: 503 }
    );
  }

  const folder = FOLDERS[kind];

  /*
   * Only video is stored privately, and only when that is switched on.
   *
   * Thumbnails and handouts are meant to be linkable — a handout behind an
   * expiring URL would break the moment an attendee opened it the next day,
   * which is exactly when a handout is useful.
   */
  const type = kind === "video" ? uploadType() : "upload";
  const signed = signUpload({ folder, type });

  return NextResponse.json({
    ...signed,
    folder,
    type,
    // Cloudinary has no standalone "audio" resource type — an audio-only file
    // is stored and read back as "video".
    resourceType: kind === "video" || kind === "audio" ? "video" : kind === "pdf" ? "raw" : "image",
  });
}
