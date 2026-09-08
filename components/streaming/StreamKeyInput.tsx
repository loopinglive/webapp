"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function StreamKeyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative">
      <input
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Stream key"}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-hairline bg-surface px-3 pr-10 font-mono text-[12.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <button
        type="button"
        onClick={() => setRevealed((current) => !current)}
        aria-label={revealed ? "Hide stream key" : "Show stream key"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
