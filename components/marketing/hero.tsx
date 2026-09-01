import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Aurora } from "@/components/ui/aurora";
import { Button } from "@/components/ui/button";
import { RoomPreview } from "@/components/marketing/room-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-36 sm:pt-44">
      <Aurora />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
            Pre-recorded webinars that run themselves
          </span>

          <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.03] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
            Go live.
            <br />
            <span className="text-gradient">On Repeat. Sell Forever</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-ink-muted">
            Upload once. Loopinglive runs it as a real live event — waiting room,
            buzzing chat, AI moderators answering every guest, and an offer that
            lands on the exact second you rehearsed.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                See how it works
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-[12.5px] text-ink-faint">
            No card required · Unlimited webinars on paid plans
          </p>
        </div>

        <div className="mt-16 sm:mt-20">
          <RoomPreview />
        </div>
      </div>
    </section>
  );
}
