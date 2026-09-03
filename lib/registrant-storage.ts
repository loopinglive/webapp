import type { StoredRegistrant } from "@/types";

// Attendees never create an account, so the room identifies them from what
// registration left behind in this browser.
// A test run is stored under its own key. A host who has also registered for
// their own webinar keeps that registration; previewing does not overwrite it.
const key = (webinarId: string, testSessionId?: string | null) =>
  testSessionId
    ? `loopinglive:registrant:${webinarId}:test:${testSessionId}`
    : `loopinglive:registrant:${webinarId}`;

export function saveRegistrant(
  registrant: StoredRegistrant,
  testSessionId?: string | null
) {
  try {
    localStorage.setItem(
      key(registrant.webinarId, testSessionId),
      JSON.stringify(registrant)
    );
  } catch {
    // Private mode or blocked storage — the room falls back to a guest name.
  }
}

export function readRegistrant(
  webinarId: string,
  testSessionId?: string | null
): StoredRegistrant | null {
  try {
    const raw = localStorage.getItem(key(webinarId, testSessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRegistrant;
    return parsed?.id && parsed?.fullName ? parsed : null;
  } catch {
    return null;
  }
}

export function clearRegistrant(webinarId: string, testSessionId?: string | null) {
  try {
    localStorage.removeItem(key(webinarId, testSessionId));
  } catch {
    // no-op
  }
}
