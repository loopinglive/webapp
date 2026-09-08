/** Pre-filled RTMP ingest URLs for the platforms hosts stream to most. */
export const STREAM_PLATFORMS = [
  { id: "youtube", label: "YouTube Live", rtmpUrl: "rtmp://a.rtmp.youtube.com/live2" },
  { id: "facebook", label: "Facebook Live", rtmpUrl: "rtmps://live-api-s.facebook.com:443/rtmp" },
  { id: "linkedin", label: "LinkedIn Live", rtmpUrl: "rtmp://1-rtmp-s.linkedin.com/live" },
  { id: "twitch", label: "Twitch", rtmpUrl: "rtmp://live.twitch.tv/app" },
  { id: "twitter", label: "Twitter/X Live", rtmpUrl: "rtmps://ingest.pscp.tv:443/x" },
  { id: "custom", label: "Custom RTMP", rtmpUrl: "" },
] as const;

export type StreamPlatformId = (typeof STREAM_PLATFORMS)[number]["id"];

export function platformLabel(id: string): string {
  return STREAM_PLATFORMS.find((platform) => platform.id === id)?.label ?? id;
}

/** The full URL LiveKit egress publishes to — most platforms want the key appended to the path. */
export function fullRtmpUrl(rtmpUrl: string, streamKey: string): string {
  return `${rtmpUrl.replace(/\/$/, "")}/${streamKey}`;
}
