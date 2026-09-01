import {
  BarChart3,
  Bot,
  CalendarClock,
  MessageSquare,
  MousePointerClick,
  Send,
} from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";

const STEPS = [
  {
    step: "01",
    title: "Upload your recording",
    body: "One video, hosted on Cloudinary, tracked to the exact second so every trigger fires where you placed it.",
  },
  {
    step: "02",
    title: "Set the schedule",
    body: "Daily at 8PM, Mon/Wed/Fri at noon — your call. Guests always see it in their own timezone.",
  },
  {
    step: "03",
    title: "Let the room fill",
    body: "Waiting room counts up, chat comes alive, AI moderators answer every real guest by name.",
  },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: "A chat that never sits empty",
    body: "Unlimited personas drop scripted comments on video offsets. Real guests interleave by clock time — indistinguishable.",
  },
  {
    icon: Bot,
    title: "AI moderators, human override",
    body: "Two named personas with their own voice. They answer 100% of real guests. Flip either one to Human mode mid-session.",
  },
  {
    icon: MousePointerClick,
    title: "Offers timed to the second",
    body: "The button slides up the moment you reveal the price, with a countdown, and stays pinned for the rest of the room.",
  },
  {
    icon: CalendarClock,
    title: "Polls, handouts, pinned drops",
    body: "Schedule every engagement beat on the timeline. Set it once, it fires the same way every session.",
  },
  {
    icon: Send,
    title: "Follow-up that segments itself",
    body: "Email, SMS, and WhatsApp sequences that branch on watch depth, offer clicks, and purchases automatically.",
  },
  {
    icon: BarChart3,
    title: "Know exactly where they drop",
    body: "Watch-depth heatmaps, per-attendee profiles, source breakdowns, and conversion tracked per session.",
  },
];

export function Features() {
  return (
    <>
      <section id="how" className="relative px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">
            Three steps between a recording and a room full of buyers.
          </h2>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <GlassPanel key={s.step} className="p-7">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-accent-soft">
                  {s.step}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-muted">
                  {s.body}
                </p>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Everything in the room</SectionLabel>
          <h2 className="mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">
            Built to feel live. Engineered to convert.
          </h2>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <GlassPanel
                key={f.title}
                className="group p-7 transition-colors duration-300 hover:border-accent/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent-soft transition-colors duration-300 group-hover:bg-accent/20">
                  <f.icon className="h-[18px] w-[18px]" />
                </div>
                <h3 className="mt-5 text-[16px] font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-muted">
                  {f.body}
                </p>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
      {children}
    </span>
  );
}
