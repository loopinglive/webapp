"use client";

import { useEffect } from "react";

/**
 * Registers the service worker. A no-op on browsers without support, and
 * skipped entirely in dev by the caller so a locally-cached bundle never
 * masks a hot reload.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
