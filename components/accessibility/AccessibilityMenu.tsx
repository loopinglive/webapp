"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, X } from "lucide-react";

import { KeyboardShortcuts } from "@/components/accessibility/KeyboardShortcuts";
import { useAccessibility } from "@/hooks/useAccessibility";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-2">
      <span>
        <span className="block text-[13px] text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[11.5px] text-ink-faint">{description}</span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
    </label>
  );
}

/**
 * The floating accessibility menu — always present, bottom-right, on every page.
 *
 * Everything in it is keyboard reachable: Tab cycles the toggles, Escape closes
 * the panel and returns focus to the trigger button.
 */
export function AccessibilityMenu() {
  const { preferences, update } = useAccessibility();
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (event.key === "Escape") {
        if (open) {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[150]">
        {open && (
          <div
            role="region"
            aria-label="Accessibility options"
            className="glass-strong mb-3 w-[300px] rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[13.5px] font-semibold text-ink">Accessibility</h2>
              <button
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                aria-label="Close accessibility menu"
                className="grid h-6 w-6 place-items-center rounded-full text-ink-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-2 divide-y divide-hairline">
              <Toggle
                label="Reduce motion"
                description="Turns off animations and transitions."
                checked={preferences.reduce_motion}
                onChange={(value) => update("reduce_motion", value)}
              />
              <Toggle
                label="High contrast"
                description="Increases text and border contrast."
                checked={preferences.high_contrast}
                onChange={(value) => update("high_contrast", value)}
              />
              <Toggle
                label="Large text"
                description="Increases the base text size."
                checked={preferences.large_text}
                onChange={(value) => update("large_text", value)}
              />
              <Toggle
                label="Captions"
                description="Shows captions on webinar video."
                checked={preferences.captions_enabled}
                onChange={(value) => update("captions_enabled", value)}
              />
              <Toggle
                label="Keyboard hints"
                description="Shows shortcut hints on hover."
                checked={preferences.keyboard_navigation_hints}
                onChange={(value) => update("keyboard_navigation_hints", value)}
              />
              <Toggle
                label="Screen reader mode"
                description="More detailed labels on complex UI."
                checked={preferences.screen_reader_optimised}
                onChange={(value) => update("screen_reader_optimised", value)}
              />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 text-[11.5px]">
              <button
                onClick={() => setShortcutsOpen(true)}
                className="text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Keyboard shortcuts (?)
              </button>
              <a href="/accessibility" className="text-ink-muted hover:text-ink">
                Accessibility statement
              </a>
            </div>
          </div>
        )}

        <button
          ref={triggerRef}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Accessibility options"
          className="glass-strong grid h-12 w-12 place-items-center rounded-full text-ink transition-colors hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Accessibility className="h-5 w-5" />
        </button>
      </div>

      {shortcutsOpen && <KeyboardShortcuts onClose={() => setShortcutsOpen(false)} />}
    </>
  );
}
