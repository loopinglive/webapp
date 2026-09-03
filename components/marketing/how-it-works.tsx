import Link from "next/link";
import { ArrowRight, CalendarClock, Settings2, TrendingUp, Upload } from "lucide-react";

/**
 * The four steps.
 *
 * Numbered because this genuinely is a sequence — each step depends on the one
 * before it, which is the only case where numbering carries information.
 */
const STEPS = [
  {
    icon: Upload,
    title: "Upload your video",
    body: "Record your webinar once. Upload it to Loopinglive. Never record it again.",
  },
  {
    icon: Settings2,
    title: "Set up your webinar",
    body: "Add personas, schedule timed comments, configure your offer button and your AI moderators — all from one dashboard.",
  },
  {
    icon: CalendarClock,
    title: "Schedule and publish",
    body: "Run it daily, weekly, or on the days you choose. Share your registration link and start collecting attendees.",
  },
  {
    icon: TrendingUp,
    title: "Watch the sales come in",
    body: "Your webinar runs live every session. People register, watch and buy while you do something else.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
            How it works
          </span>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">
            Set it up once. Let it run forever.
          </h2>
        </div>

        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-6"
            >
              {/* The connector only makes sense between cards on one row. */}
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -right-3 top-11 hidden h-px w-6 bg-gradient-to-r from-[#6C47FF]/60 to-transparent lg:block"
                />
              )}

              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#6C47FF]/12 text-[13px] font-semibold tabular-nums text-[#6C47FF]">
                  {index + 1}
                </span>
                <step.icon className="h-4 w-4 text-[#00D4FF]" />
              </div>

              <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#A0A0B0]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <Link
          href="/signup"
          className="mt-10 inline-flex items-center gap-2 text-[14px] font-medium text-[#6C47FF] transition-colors hover:text-[#8A6BFF]"
        >
          Start setting up for free
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
