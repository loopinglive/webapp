import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

const CLOUD = () => process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export function signUpload(params: Record<string, string | number>) {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, ...params },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  };
}

/**
 * The progressive MP4.
 *
 * Kept as the fallback for Safari's older HLS quirks and for anywhere hls.js
 * cannot run. `q_auto,f_auto` adapts quality and container to the browser, but
 * it is one file at one bitrate — it cannot step down mid-playback.
 */
export function videoUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD()}/video/upload/q_auto,f_auto/${publicId}.mp4`;
}

/**
 * The adaptive stream.
 *
 * `sp_auto` asks Cloudinary for an HLS streaming profile: several renditions,
 * with the player stepping between them as the connection changes. This is
 * what stops a weak network from buffering — and buffering is what forces the
 * playhead correction that makes a recorded webinar look recorded.
 */
export function streamUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD()}/video/upload/sp_auto/${publicId}.m3u8`;
}

/**
 * Auto-generated captions, as a WebVTT track.
 *
 * Requires the transcription add-on to have run on upload. Returns a URL
 * regardless — the player treats a 404 as "no captions" rather than an error,
 * which keeps this a one-line change rather than a schema migration.
 */
export function captionsUrl(publicId: string, locale = "en-US") {
  return `https://res.cloudinary.com/${CLOUD()}/video/upload/${publicId}.transcript.vtt?locale=${locale}`;
}

export function posterUrl(publicId: string, second = 1) {
  return `https://res.cloudinary.com/${CLOUD()}/video/upload/so_${second},q_auto,f_auto/${publicId}.jpg`;
}

/**
 * Whether uploads are private.
 *
 * Off by default, and deliberately so. Signing only bites on assets stored as
 * `authenticated`; a signed URL for an asset stored as `upload` is theatre,
 * because the unsigned URL still works. Turning this on therefore changes how
 * videos are *stored*, which means every video uploaded before the change
 * keeps its public URL until it is re-uploaded or migrated through
 * Cloudinary's `explicit` API.
 *
 * A deployment that flipped this silently would leave existing webinars
 * playing from public URLs while believing they were protected, which is worse
 * than knowing they are public.
 */
export function privateVideosEnabled() {
  return process.env.CLOUDINARY_PRIVATE_VIDEOS === "true";
}

/** `authenticated` when private delivery is on, so signing actually applies. */
export function uploadType() {
  return privateVideosEnabled() ? "authenticated" : "upload";
}

/**
 * A delivery URL that stops working.
 *
 * The plain URL is permanent and visible in the network tab, so anyone who
 * finds it keeps the whole webinar forever and can pass it on. This one
 * carries an expiry in its signature.
 *
 * Six hours by default: long enough that a session cannot outlive its own
 * video URL, short enough that a link scraped from the network tab is not
 * worth passing around.
 */
export function signedVideoUrl(
  publicId: string,
  {
    format = "m3u8",
    expiresInSeconds = 60 * 60 * 6,
  }: { format?: "m3u8" | "mp4"; expiresInSeconds?: number } = {}
) {
  const isHls = format === "m3u8";

  return cloudinary.url(publicId, {
    resource_type: "video",
    type: uploadType(),
    format,
    // The same transformations the public builders apply, so switching between
    // them does not change what plays.
    transformation: isHls
      ? [{ streaming_profile: "auto" }]
      : [{ quality: "auto", fetch_format: "auto" }],
    sign_url: true,
    secure: true,
    expires_at: Math.round(Date.now() / 1000) + expiresInSeconds,
  });
}
