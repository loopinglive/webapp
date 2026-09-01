"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Send, Users } from "lucide-react";

import { LiveBadge } from "@/components/ui/live-badge";
import { formatOffset, initials } from "@/lib/utils";

type ScriptedMessage = {
  at: number;
  name: string;
  body: string;
  real?: boolean;
  replyTo?: string;
};

// Mirrors a real session: personas fire on video offsets, the AI moderator answers real guests.
const SCRIPT: ScriptedMessage[] = [
  { at: 2, name: "Amara Okafor", body: "Joining from Lagos 🇳🇬" },
  { at: 5, name: "Tom Bracken", body: "second time watching this, took notes" },
  { at: 8, name: "Priya Raman", body: "does this work for a service business?" },
  {
    at: 11,
    name: "Sarah",
    body: "Yes Priya — service businesses are honestly where it converts best 💜",
    replyTo: "Priya Raman",
  },
  { at: 14, name: "You", body: "how long is the replay up for?", real: true },
  {
    at: 17,
    name: "James",
    body: "48 hours by default. Host sets the window.",
    replyTo: "You",
  },
  { at: 20, name: "Dee Coleman", body: "the framework slide 🔥🔥" },
  { at: 23, name: "Marc Lefèvre", body: "watching from Paris, 1am here" },
  { at: 26, name: "Nadia Haddad", body: "wait, it schedules itself daily?" },
  {
    at: 29,
    name: "Sarah",
    body: "Daily, weekly, or specific days — you set it once ✨",
    replyTo: "Nadia Haddad",
  },
];

const AVATAR_TONES = [
  "from-accent to-accent-deep",
  "from-cyan to-accent",
  "from-live to-accent-soft",
  "from-accent-soft to-cyan",
];

export function RoomPreview() {
  const [elapsed, setElapsed] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const loop = 34;

  useEffect(() => {
    const id = setInterval(() => setElapsed((t) => (t + 1) % loop), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = SCRIPT.filter((m) => m.at <= elapsed).slice(-6);
  const viewers = 812 + elapsed * 7;

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [visible.length]);

  return (
    <div className="glass-strong grid gap-0 overflow-hidden rounded-panel lg:grid-cols-[1.65fr_1fr]">
      {/* Stage */}
      <div className="relative aspect-video bg-gradient-to-br from-surface-2 via-void to-surface">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(108,71,255,0.28),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_70%,rgba(0,212,255,0.14),transparent_55%)]" />

        <div className="absolute left-4 top-4 flex items-center gap-2">
          <LiveBadge />
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-ink-muted">
            <Users className="h-3 w-3" />
            {viewers.toLocaleString()} watching
          </span>
        </div>

        <div className="absolute inset-0 grid place-items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/8 backdrop-blur-sm animate-pulse-ring">
            <Play className="ml-0.5 h-5 w-5 fill-ink text-ink" />
          </div>
        </div>

        {/* Timeline with the offer marker */}
        <div className="absolute inset-x-4 bottom-4">
          <div className="mb-2 flex items-center justify-between text-[11px] tabular-nums text-ink-faint">
            <span>{formatOffset(elapsed * 62)}</span>
            <span>{formatOffset(loop * 62)}</span>
          </div>
          <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-cyan"
              animate={{ width: `${(elapsed / loop) * 100}%` }}
              transition={{ ease: "linear", duration: 1 }}
            />
          </div>
        </div>

        <AnimatePresence>
          {elapsed > 24 && (
            <motion.div
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="absolute inset-x-4 bottom-14"
            >
              <div className="glow-accent flex items-center justify-between rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white">
                <span>Claim your seat — 40% off</span>
                <span className="tabular-nums text-white/80">14:32</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat */}
      <div className="flex min-h-[380px] flex-col border-t border-white/8 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <span className="text-[13px] font-semibold">Live chat</span>
          <span className="text-[11px] text-ink-faint">Q&amp;A</span>
        </div>

        <div
          ref={feedRef}
          className="flex-1 space-y-3 overflow-hidden px-4 py-4"
        >
          <AnimatePresence initial={false}>
            {visible.map((m, i) => (
              <motion.div
                key={`${m.at}-${m.name}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-2.5"
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-semibold text-white ${
                    AVATAR_TONES[i % AVATAR_TONES.length]
                  }`}
                >
                  {initials(m.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-[12px] font-semibold ${
                        m.real ? "text-cyan" : "text-ink"
                      }`}
                    >
                      {m.name}
                    </span>
                  </div>
                  {m.replyTo && (
                    <div className="text-[10px] text-ink-faint">
                      ↩ replying to @{m.replyTo}
                    </div>
                  )}
                  <p className="text-[12.5px] leading-relaxed text-ink-muted">
                    {m.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="border-t border-white/8 p-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-2/70 px-4 py-2.5">
            <span className="flex-1 text-[12.5px] text-ink-faint">
              Say something…
            </span>
            <Send className="h-3.5 w-3.5 text-ink-faint" />
          </div>
        </div>
      </div>
    </div>
  );
}
