import type { StoredRegistrant } from "@/types";

// Attendees never create an account, so the room identifies them from what
// registration left behind in this browser.
const key = (webinarId: string) => `loopinglive:registrant:${webinarId}`;

export function saveRegistrant(registrant: StoredRegistrant) {
  try {
    localStorage.setItem(key(registrant.webinarId), JSON.stringify(registrant));
  } catch {
    // Private mode or blocked storage — the room falls back to a guest name.
  }
}

export function readRegistrant(webinarId: string): StoredRegistrant | null {
  try {
    const raw = localStorage.getItem(key(webinarId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRegistrant;
    return parsed?.id && parsed?.fullName ? parsed : null;
  } catch {
    return null;
  }
}

export function clearRegistrant(webinarId: string) {
  try {
    localStorage.removeItem(key(webinarId));
  } catch {
    // no-op
  }
}
