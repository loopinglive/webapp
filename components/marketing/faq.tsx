"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  {
    q: "Do attendees know the webinar is pre-recorded?",
    a: "The room behaves exactly like a live event — a waiting room, a countdown, a chat filling up in real time, and moderators replying to them by name. What you disclose is up to you and your local advertising rules.",
  },
  {
    q: "Can I swap the video without rebuilding everything?",
    a: "Yes. Upload a new recording and keep your personas, timed comments, polls, and offer triggers — you only adjust the offsets that moved.",
  },
  {
    q: "How do the AI moderators work?",
    a: "You name two personas and write a short personality brief for each. They get the webinar topic, offer details, and the current video timestamp, then reply to every real guest and to a percentage of persona comments you set.",
  },
  {
    q: "Can I take over the chat mid-session?",
    a: "Flip either persona from AI to Human in the live panel and type under their name and avatar. Real guests never see the switch.",
  },
  {
    q: "What happens after the webinar ends?",
    a: "Attendees are segmented by watch depth, offer clicks, and purchases, then dropped into the matching email, SMS, and WhatsApp sequences. Buyers are removed from offer follow-up automatically.",
  },
  {
    q: "Is there a live webinar mode?",
    a: "Live broadcasting is on the roadmap. Everything today is built around pre-recorded sessions that run on a schedule.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          FAQ
        </span>
        <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">
          Questions worth asking.
        </h2>

        <div className="mt-12 divide-y divide-white/8 border-y border-white/8">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-accent-soft"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15.5px] font-medium tracking-tight">
                    {item.q}
                  </span>
                  <Plus
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-faint transition-transform duration-300",
                      isOpen && "rotate-45 text-accent-soft"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 pr-10 text-[14.5px] leading-relaxed text-ink-muted">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
