"use client";

import { useEffect, useState } from "react";

/**
 * Catches the moment before someone leaves.
 *
 * Desktop uses the cursor crossing the top edge, which is the only reliable
 * pre-exit signal a browser gives. Mobile has no equivalent — there is no
 * cursor and `beforeunload` is unreliable — so it uses a back-gesture guard
 * via a pushed history entry instead.
 *
 * Fires once per session. A prompt that reappears every time someone reaches
 * for a bookmark is worse than no prompt.
 */
export function useExitIntent({
  enabled = true,
  onTrigger,
}: {
  enabled?: boolean;
  onTrigger?: () => void;
} = {}) {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (!enabled || triggered) return;
    if (typeof window === "undefined") return;

    let fired = false;

    const fire = () => {
      if (fired) return;
      fired = true;
      setTriggered(true);
      onTrigger?.();
    };

    // Desktop: cursor leaves through the top of the viewport, which in
    // practice means the address bar, a tab, or the close button.
    const onMouseOut = (event: MouseEvent) => {
      if (event.clientY <= 0 && !event.relatedTarget) fire();
    };

    // Mobile: a pushed entry means the first back gesture pops it rather than
    // leaving the page, and we can offer something before it happens again.
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const onPopState = () => fire();

    if (isTouch) {
      window.history.pushState({ exitGuard: true }, "");
      window.addEventListener("popstate", onPopState);
    } else {
      document.addEventListener("mouseout", onMouseOut);
    }

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled, triggered, onTrigger]);

  return { triggered, dismiss: () => setTriggered(false) };
}
