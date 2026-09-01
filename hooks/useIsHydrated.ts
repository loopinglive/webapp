"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and the first client render, true afterwards.
 *
 * Anything that only exists in the browser — localStorage, the viewer's
 * timezone — has to wait for this, or the server markup and the first client
 * render disagree and React throws away the tree.
 */
export function useIsHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
