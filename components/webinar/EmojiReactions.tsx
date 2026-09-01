"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const EMOJIS = ["👏", "🔥", "❤️", "💯", "😮"] as const;

type Floater = { id: number; emoji: string; left: number; drift: number };

export function EmojiReactions({
  onSend,
  disabled,
}: {
  onSend: (content: string) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const nextId = useRef(0);

  // Drop each floater once its animation is done so the list cannot grow.
  useEffect(() => {
    if (!floaters.length) return;
    const id = setTimeout(() => setFloaters((current) => current.slice(1)), 2600);
    return () => clearTimeout(id);
  }, [floaters]);

  const react = useCallback(
    (emoji: string) => {
      if (disabled) return;
      setFloaters((current) => [
        ...current,
        {
          id: nextId.current++,
          emoji,
          left: 20 + Math.random() * 60,
          drift: Math.random() * 40 - 20,
        },
      ]);
      void onSend(emoji);
    },
    [disabled, onSend]
  );

  return (
    <>
      {/* Floats up over the room, ignores clicks. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      >
        {floaters.map((floater) => (
          <span
            key={floater.id}
            className="absolute bottom-24 animate-float-up text-3xl"
            style={{
              left: `${floater.left}%`,
              ["--drift" as string]: `${floater.drift}px`,
            }}
          >
            {floater.emoji}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5 px-3 pb-3">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            disabled={disabled}
            aria-label={`React ${emoji}`}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#1E1E2E] bg-[#0A0A0F] text-[15px] transition-all duration-200 hover:scale-110 hover:border-[#6C47FF]/60 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
