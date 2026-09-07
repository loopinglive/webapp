"use client";

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "?", description: "Open this shortcuts panel" },
  { keys: "Esc", description: "Close a modal or panel" },
  { keys: "Tab / Shift+Tab", description: "Move between interactive elements" },
  { keys: "Enter / Space", description: "Activate the focused button or link" },
];

/**
 * Only lists shortcuts this build actually wires up.
 *
 * A shortcuts panel is read by people who rely on the keyboard, so listing one
 * that does not fire is worse than not listing it at all — it reads as broken
 * rather than absent.
 */
export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6"
      >
        <h2 id="keyboard-shortcuts-title" className="text-[15px] font-semibold text-ink">
          Keyboard shortcuts
        </h2>
        <ul className="mt-4 space-y-2.5">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.keys} className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-ink-muted">{shortcut.description}</span>
              <kbd className="rounded-md border border-hairline bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] text-ink">
                {shortcut.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-6 h-9 w-full rounded-lg border border-hairline text-[13px] text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Close
        </button>
      </div>
    </div>
  );
}
