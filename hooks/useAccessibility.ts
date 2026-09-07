"use client";

import { useCallback, useEffect, useState } from "react";

export type AccessibilityPreferences = {
  reduce_motion: boolean;
  high_contrast: boolean;
  large_text: boolean;
  screen_reader_optimised: boolean;
  captions_enabled: boolean;
  caption_size: "small" | "medium" | "large" | "extra-large";
  caption_background: boolean;
  keyboard_navigation_hints: boolean;
};

const DEFAULTS: AccessibilityPreferences = {
  reduce_motion: false,
  high_contrast: false,
  large_text: false,
  screen_reader_optimised: false,
  captions_enabled: true,
  caption_size: "medium",
  caption_background: true,
  keyboard_navigation_hints: true,
};

const STORAGE_KEY = "loopinglive-accessibility";

function readLocal(): Partial<AccessibilityPreferences> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<AccessibilityPreferences>) : {};
  } catch {
    return {};
  }
}

function writeLocal(preferences: AccessibilityPreferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Private browsing / storage disabled — the toggle still works for this load.
  }
}

/** Applies the classes the design system and globals.css read for each toggle. */
function applyToDocument(preferences: AccessibilityPreferences) {
  const root = document.documentElement;
  root.classList.toggle("reduce-motion", preferences.reduce_motion);
  root.classList.toggle("high-contrast", preferences.high_contrast);
  root.classList.toggle("large-text", preferences.large_text);
  root.classList.toggle("screen-reader-optimised", preferences.screen_reader_optimised);
}

/**
 * Accessibility preferences, synced to the account when signed in and to
 * localStorage otherwise (attendees have no account to sync to).
 */
export function useAccessibility() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const local = readLocal();
      let merged: AccessibilityPreferences = { ...DEFAULTS, ...local };

      try {
        const response = await fetch("/api/accessibility/preferences", { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as { preferences: AccessibilityPreferences | null };
          if (payload.preferences) {
            merged = {
              reduce_motion: payload.preferences.reduce_motion,
              high_contrast: payload.preferences.high_contrast,
              large_text: payload.preferences.large_text,
              screen_reader_optimised: payload.preferences.screen_reader_optimised,
              captions_enabled: payload.preferences.captions_enabled,
              caption_size: payload.preferences.caption_size,
              caption_background: payload.preferences.caption_background,
              keyboard_navigation_hints: payload.preferences.keyboard_navigation_hints,
            };
          }
        }
      } catch {
        // Signed out, or offline — the local copy stands.
      }

      if (cancelled) return;
      setPreferences(merged);
      applyToDocument(merged);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      applyToDocument(next);
      writeLocal(next);
      fetch("/api/accessibility/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      }).catch(() => {
        // Signed out, or offline — localStorage already has it for this device.
      });
      return next;
    });
  }, []);

  return { preferences, update, loaded };
}
