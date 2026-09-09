"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeChoice = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "loopinglive-theme";

type ThemeState = {
  /** What the host picked, which may be "system". */
  choice: ThemeChoice;
  /** What that resolves to right now — never "system". */
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice) => void;
  /** Flips between the two concrete themes, resolving "system" first. */
  toggle: () => void;
};

const Context = createContext<ThemeState | null>(null);

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function readStored(): ThemeChoice {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "light" || raw === "dark" || raw === "system" ? raw : "dark";
  } catch {
    return "dark";
  }
}

/**
 * Theme, in one place.
 *
 * globals.css only knows about `html[data-theme="light"]` — "system" is
 * resolved here rather than with a media query in CSS, so there is a single
 * source of truth and the toggle can always say which theme you are actually
 * looking at.
 *
 * Dark stays the default when nothing is stored: this app shipped dark, and
 * inheriting the OS preference would flip the UI under everyone already using
 * it without them asking.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("dark");
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>("dark");

  // Deferred rather than read during render: localStorage and matchMedia do
  // not exist on the server, and reading them in an initialiser would make the
  // first client render disagree with the markup the server sent.
  useEffect(() => {
    const timer = setTimeout(() => {
      setChoiceState(readStored());
      setSystemPreference(systemTheme());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Someone on "system" who changes their OS theme should see it happen.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (event: MediaQueryListEvent) => setSystemPreference(event.matches ? "light" : "dark");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolved: ResolvedTheme = choice === "system" ? systemPreference : choice;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    // Keeps native form controls, scrollbars and the mobile browser chrome in
    // step with the page rather than staying on the dark default.
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing — the choice still applies for this session.
    }
  }, []);

  const toggle = useCallback(() => {
    setChoice(resolved === "dark" ? "light" : "dark");
  }, [resolved, setChoice]);

  const value = useMemo(() => ({ choice, resolved, setChoice, toggle }), [choice, resolved, setChoice, toggle]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTheme(): ThemeState {
  const context = useContext(Context);
  if (!context) {
    // Outside the provider (an attendee-facing room, say) the theme is simply
    // the dark default and cannot be changed — better than throwing.
    return { choice: "dark", resolved: "dark", setChoice: () => {}, toggle: () => {} };
  }
  return context;
}
