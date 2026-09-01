"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  TimedCta,
  TimedHandout,
  TimedPinnedMessage,
  TimedPoll,
} from "@/types";

type Payload = {
  polls: TimedPoll[];
  handouts: TimedHandout[];
  ctas: TimedCta[];
  pinned: TimedPinnedMessage[];
};

const EMPTY: Payload = { polls: [], handouts: [], ctas: [], pinned: [] };

/** Is `item` on screen at `now`, given its offset and how long it lasts? */
function showing(
  item: { video_offset_seconds: number },
  duration: number,
  now: number
) {
  return (
    now >= item.video_offset_seconds &&
    now < item.video_offset_seconds + duration
  );
}

/**
 * Turns the webinar's scheduled engagement into what should be on screen now.
 *
 * Everything is loaded once and evaluated against the playhead, so a viewer who
 * joins late sees the handouts that have already dropped but not a poll whose
 * window closed twenty minutes ago.
 */
export function useEngagement({
  webinarId,
  currentTime,
  enabled,
}: {
  webinarId: string;
  currentTime: number;
  enabled: boolean;
}) {
  const [data, setData] = useState<Payload>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/webinar/${webinarId}/engagement`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        setData((await response.json()) as Payload);
      } catch {
        // The room works fine without engagement; nothing to recover.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [webinarId, enabled]);

  const activePoll = useMemo(
    () =>
      data.polls.find((poll) =>
        showing(poll, poll.duration_seconds, currentTime)
      ) ?? null,
    [data.polls, currentTime]
  );

  const activeCta = useMemo(
    () =>
      data.ctas.find((cta) => showing(cta, cta.duration_seconds, currentTime)) ??
      null,
    [data.ctas, currentTime]
  );

  const activePinned = useMemo(
    () =>
      data.pinned.find((message) =>
        showing(message, message.duration_seconds, currentTime)
      ) ?? null,
    [data.pinned, currentTime]
  );

  // Handouts have no window — once dropped they stay downloadable.
  const droppedHandouts = useMemo(
    () =>
      data.handouts.filter(
        (handout) => currentTime >= handout.video_offset_seconds
      ),
    [data.handouts, currentTime]
  );

  return { activePoll, activeCta, activePinned, droppedHandouts };
}
