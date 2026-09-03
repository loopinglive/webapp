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
 * A signed URL that stops working.
 *
 * The plain delivery URL is permanent and visible in the network tab, so
 * anyone who finds it keeps the whole webinar forever and can pass it on.
 * Used for replays, where the link is handed to one person by email.
 */
export function signedVideoUrl(publicId: string, expiresInSeconds = 60 * 60 * 6) {
  return cloudinary.utils.private_download_url(publicId, "mp4", {
    resource_type: "video",
    expires_at: Math.round(Date.now() / 1000) + expiresInSeconds,
  });
}
