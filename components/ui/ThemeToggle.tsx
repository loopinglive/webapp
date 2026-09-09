"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type ThemeChoice } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Three states, not two: someone who wants the app to follow their machine
 * should not have to come back and flip it twice a day.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { choice, setChoice } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("inline-flex items-center gap-0.5 rounded-full border border-hairline bg-surface p-0.5", className)}
    >
      {OPTIONS.map((option) => {
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setChoice(option.value)}
            title={option.label}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors",
              active ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
            )}
          >
            <option.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The compact version, for a sidebar footer or a toolbar with no room for three pills. */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const Icon = resolved === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      title={resolved === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink",
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
