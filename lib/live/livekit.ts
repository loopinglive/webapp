import "server-only";

import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
} from "livekit-server-sdk";

/**
 * LiveKit, wrapped.
 *
 * Every accessor is lazy. Constructing a client at module load would crash
 * every route that merely imports this file on a deployment with no LiveKit
 * credentials — which is every deployment until the keys are set, and the
 * platform ran for nine phases without them.
 */

export function liveConfigured() {
  return Boolean(
    process.env.LIVEKIT_API_KEY?.trim() &&
      process.env.LIVEKIT_API_SECRET?.trim() &&
      process.env.LIVEKIT_URL?.trim()
  );
}

function credentials() {
  const key = process.env.LIVEKIT_API_KEY?.trim();
  const secret = process.env.LIVEKIT_API_SECRET?.trim();
  const url = process.env.LIVEKIT_URL?.trim();

  if (!key || !secret || !url) {
    throw new Error("LiveKit is not configured on this deployment.");
  }
  return { key, secret, url };
}

/** LiveKit's REST calls want https, while clients connect over wss. */
function httpUrl(wsUrl: string) {
  return wsUrl.replace(/^ws/, "http");
}

let rooms: RoomServiceClient | null = null;
export function roomService() {
  const { key, secret, url } = credentials();
  rooms ??= new RoomServiceClient(httpUrl(url), key, secret);
  return rooms;
}

let egress: EgressClient | null = null;
export function egressService() {
  const { key, secret, url } = credentials();
  egress ??= new EgressClient(httpUrl(url), key, secret);
  return egress;
}

/** Deterministic and unique, so a stale room can never be rejoined. */
export function roomNameFor(webinarId: string, liveSessionId: string) {
  return `webinar_${webinarId}_${liveSessionId}`;
}

type TokenInput = {
  roomName: string;
  identity: string;
  name: string;
  /** Only the host publishes. */
  canPublish: boolean;
};

/**
 * Mints a join token.
 *
 * `canPublish` is set here rather than being enforced in the UI, because a UI
 * restriction is not a restriction — an attendee with dev tools could
 * otherwise publish into someone else's webinar.
 */
export async function createAccessToken(input: TokenInput) {
  const { key, secret } = credentials();

  const token = new AccessToken(key, secret, {
    identity: input.identity,
    name: input.name,
    // Long enough for a webinar plus overrun, short enough that a leaked
    // token is not a standing invitation.
    ttl: "4h",
  });

  token.addGrant({
    room: input.roomName,
    roomJoin: true,
    canPublish: input.canPublish,
    canPublishData: input.canPublish,
    canSubscribe: true,
  });

  return token.toJwt();
}

/** Live participant count, used for the viewer number the host sees. */
export async function participantCount(roomName: string) {
  try {
    const participants = await roomService().listParticipants(roomName);
    // The host is in the room but is not an audience member.
    return Math.max(0, participants.filter((p) => p.identity !== "host").length);
  } catch {
    // A room that does not exist yet has nobody in it.
    return 0;
  }
}

/**
 * Starts recording the room to a file.
 *
 * Deliberately started when the broadcast starts rather than when the room is
 * created — nobody wants their backstage microphone test in the replay.
 */
export async function startRecording(roomName: string) {
  // A protobuf message, not a plain object -- the SDK checks its methods.
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: `${roomName}-{time}`,
    disableManifest: true,
  });

  const info = await egressService().startRoomCompositeEgress(roomName, output, {
    layout: "speaker",
    audioOnly: false,
  });

  return info.egressId;
}

export async function stopRecording(egressId: string) {
  try {
    return await egressService().stopEgress(egressId);
  } catch {
    // Already stopped, or the room ended on its own. Ending must be
    // idempotent, so this is not an error worth propagating.
    return null;
  }
}

/** Where the finished recording ended up, once egress reports complete. */
export async function recordingUrl(egressId: string) {
  const list = await egressService().listEgress({ egressId });
  const info = list[0];
  if (!info) return null;

  const file = info.fileResults?.[0];
  return file?.location || file?.filename || null;
}

export async function closeRoom(roomName: string) {
  try {
    await roomService().deleteRoom(roomName);
  } catch {
    // A room with no participants is reaped automatically; deleting one that
    // has already gone is a success, not a failure.
  }
}
