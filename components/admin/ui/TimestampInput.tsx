"use client";

import { useState } from "react";

import { TextInput } from "@/components/admin/ui/Field";
import { formatOffset, parseOffset } from "@/lib/utils";

/**
 * HH:MM:SS in, seconds out.
 *
 * Every offset is stored in seconds; the host thinks in timecodes. Kept as
 * local text while focused so a half-typed "00:1" is not parsed to 1 second
 * under their cursor.
 */
export function TimestampInput({
  value,
  onChange,
  max,
  className,
}: {
  value: number;
  onChange: (seconds: number) => void;
  max?: number;
  className?: string;
}) {
  const [text, setText] = useState(() => formatOffset(value));
  const [editing, setEditing] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Re-sync when the value changes underneath us — a pin dragged on the
  // timeline, say. Adjusting during render rather than in an effect avoids the
  // extra commit, and the guard keeps it from looping.
  if (value !== lastValue) {
    setLastValue(value);
    if (!editing) setText(formatOffset(value));
  }

  return (
    <TextInput
      value={text}
      inputMode="numeric"
      placeholder="00:00:00"
      className={className}
      onFocus={() => setEditing(true)}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        setEditing(false);
        const seconds = Math.max(0, parseOffset(text));
        const clamped = max ? Math.min(seconds, Math.floor(max)) : seconds;
        setText(formatOffset(clamped));
        onChange(clamped);
      }}
    />
  );
}
