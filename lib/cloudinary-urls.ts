/**
 * Cloudinary delivery URLs, safe for the browser.
 *
 * Split from lib/cloudinary.ts because that module configures the SDK with the
 * API secret. Importing it from a client component would pull the secret
 * toward the browser bundle; these are pure string builders over the public
 * cloud name.
 */
const CLOUD = () => process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/** Adaptive HLS: several renditions, stepped between as the connection changes. */
export function streamUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD()}/video/upload/sp_auto/${publicId}.m3u8`;
}

/** Progressive MP4, for Safari quirks and anywhere hls.js cannot run. */
export function progressiveUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD()}/video/upload/q_auto,f_auto/${publicId}.mp4`;
}

/**
 * Auto-generated captions as WebVTT.
 *
 * Present only if transcription ran on upload. The player treats a 404 as
 * "no captions" rather than an error, so this can be requested unconditionally.
 */
export function captionsUrl(publicId: string, locale = "en-US") {
  return `https://res.cloudinary.com/${CLOUD()}/video/upload/${publicId}.transcript.vtt?locale=${locale}`;
}
